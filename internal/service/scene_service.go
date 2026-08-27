package service

import (
	"database/sql"
	"errors"
	"fmt"
	"novel-be/internal/models"
	"novel-be/internal/repository"
	"strconv"
	"strings"
)

type sceneService struct {
	repo repository.SceneRepository
	db   *sql.DB
}

func NewSceneService(repo repository.SceneRepository, db *sql.DB) SceneService {
	return &sceneService{repo: repo, db: db}
}

// 🟢 ปรุง URL รูปภาพให้สมบูรณ์เพื่อให้ Frontend ใช้งานได้ทันที
func (s *sceneService) formatImageURL(imageName string) string {
	if imageName == "" {
		return ""
	}
	// baseURL นี้ต้องตรงกับที่ตั้งใน Docker MinIO
	baseURL := "http://localhost:9000/novel-buckets/"
	return baseURL + imageName
}

func truncateContent(content string, maxLen int) string {
	runes := []rune(content)
	if len(runes) <= maxLen {
		return content
	}
	return string(runes[:maxLen]) + "..."
}

func (s *sceneService) isChapterOne(chapterID int) (bool, error) {
	var episode int
	err := s.db.QueryRow(`SELECT episode FROM chapters WHERE chapter_id = $1`, chapterID).Scan(&episode)
	if err != nil {
		return false, err
	}
	return episode == 1, nil
}

func (s *sceneService) getExistingStartSceneID(novelID int) (int, error) {
	var sceneID int
	err := s.db.QueryRow(`SELECT scene_id FROM scenes WHERE novel_id = $1 AND type = 'start' LIMIT 1`, novelID).Scan(&sceneID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, nil
		}
		return 0, err
	}
	return sceneID, nil
}

func (s *sceneService) GetScene(sceneID int) (models.SceneResponse, error) {
	scene, err := s.repo.GetSceneByID(sceneID)
	if err != nil {
		return models.SceneResponse{}, err
	}
	choices, err := s.repo.GetChoicesBySceneID(sceneID)
	if err != nil {
		return models.SceneResponse{}, err
	}

	return models.SceneResponse{
		SceneID:           scene.SceneID,
		ChapterID:         scene.ChapterID,
		NovelID:           scene.NovelID,
		Title:             scene.Title,
		Content:           scene.Content,
		Type:              scene.Type,
		Status:            scene.Status,
		ImageURL:          s.formatImageURL(scene.ImageURL),
		EndingTitle:       scene.EndingTitle,
		EndingType:        scene.EndingType,
		EndingDescription: scene.EndingDescription,
		NovelTitle:        scene.NovelTitle,     // 🟢 🎯 ยัดชื่อเรื่องหลักส่งไปหน้าบ้าน
		ChapterTitle:      scene.ChapterTitle,   // 🟢 🎯 ยัดชื่อตอนย่อยส่งไปหน้าบ้าน
		ChapterEpisode:    scene.ChapterEpisode, //eww
		Choices:           choices,
	}, nil
}

func (s *sceneService) GetStartScene(novelID int) (models.SceneResponse, error) {
	scene, err := s.repo.GetStartSceneByNovelID(novelID)
	if err != nil {
		return models.SceneResponse{}, err
	}
	choices, err := s.repo.GetChoicesBySceneID(scene.SceneID)
	if err != nil {
		return models.SceneResponse{}, err
	}

	return models.SceneResponse{
		SceneID:           scene.SceneID,
		ChapterID:         scene.ChapterID,
		NovelID:           scene.NovelID,
		Title:             scene.Title,
		Content:           scene.Content,
		Type:              scene.Type,
		Status:            scene.Status,
		ImageURL:          s.formatImageURL(scene.ImageURL),
		EndingTitle:       scene.EndingTitle,
		EndingType:        scene.EndingType,
		EndingDescription: scene.EndingDescription,
		NovelTitle:        scene.NovelTitle,   // 🟢 🎯 ยัดชื่อเรื่องหลักส่งไปหน้าบ้าน
		ChapterTitle:      scene.ChapterTitle, // 🟢 🎯 ยัดชื่อตอนย่อยส่งไปหน้าบ้าน
		ChapterEpisode:    scene.ChapterEpisode,
		Choices:           choices,
	}, nil
}

func (s *sceneService) GetScenesByChapterID(chapterID int) ([]models.Scene, error) {
	return s.repo.GetScenesByChapterID(chapterID)
}

func (s *sceneService) CreateScene(scene models.Scene) (int, error) {
	// ตัดช่องว่างหน้า-หลังชื่อฉาก ป้องกัน "ฉากที่ 1" กับ "ฉากที่ 1 " ซ้ำกัน
	scene.Title = strings.TrimSpace(scene.Title)
	if strings.TrimSpace(scene.Status) == "" {
		scene.Status = "draft"
	}

	count, err := s.repo.CountScenesInNovel(scene.NovelID)
	if err != nil {
		return 0, err
	}

	chapterOne, err := s.isChapterOne(scene.ChapterID)
	if err != nil {
		return 0, err
	}

	if count == 0 {
		// Automate the very first scene of the novel to start only if it belongs to chapter 1
		if chapterOne {
			scene.Type = "start"
		} else {
			scene.Type = "normal"
		}
	} else if strings.EqualFold(scene.Type, "start") {
		if !chapterOne {
			return 0, errors.New("Start scene must belong to chapter 1")
		}
		existingStartID, err := s.getExistingStartSceneID(scene.NovelID)
		if err != nil {
			return 0, err
		}
		if existingStartID != 0 {
			return 0, errors.New("Novel already has a start scene")
		}
		scene.Type = "start"
	} else if scene.Type == "" || strings.EqualFold(scene.Type, "draft") {
		scene.Type = "normal"
	}

	exists, _ := s.repo.CheckSceneExists(scene.ChapterID, scene.Title)
	if exists {
		return 0, errors.New("ฉากนี้มีอยู่แล้วในตอนเดียวกัน")
	}
	return s.repo.CreateScene(scene)
}

func (s *sceneService) UpdateScene(scene models.Scene) error {
	existing, err := s.repo.GetSceneByID(scene.SceneID)
	if err != nil {
		return err
	}

	if scene.Title != "" {
		scene.Title = strings.TrimSpace(scene.Title)
	} else {
		scene.Title = existing.Title
	}

	if scene.Content == "" {
		scene.Content = existing.Content
	}

	if strings.TrimSpace(scene.Status) == "" {
		scene.Status = existing.Status
	}

	effectiveType := existing.Type
	if strings.TrimSpace(scene.Type) != "" {
		requestedType := strings.ToLower(strings.TrimSpace(scene.Type))
		if requestedType == "start" {
			if existing.Type == "ending" {
				return errors.New("ไม่สามารถตั้งค่าฉากเริ่มต้นให้เป็นฉากจบได้ กรุณาเลือกฉากอื่นเป็นฉากจบ")
			}
			chapterOne, err := s.isChapterOne(existing.ChapterID)
			if err != nil {
				return err
			}
			if !chapterOne {
				return errors.New("Start scene must belong to chapter 1")
			}

			currentStartID, err := s.getExistingStartSceneID(existing.NovelID)
			if err != nil {
				return err
			}
			if currentStartID != 0 && currentStartID != existing.SceneID {
				if err := s.repo.UpdateSceneTypeByID(currentStartID, "normal"); err != nil {
					return err
				}
			}
			effectiveType = "start"
		} else if requestedType == "ending" {
			effectiveType = "ending"
		} else {
			effectiveType = requestedType
		}
	}

	if existing.Type == "start" {
		effectiveType = "start"
	}

	if effectiveType == "ending" {
		choices, err := s.repo.GetChoicesBySceneID(scene.SceneID)
		if err == nil && len(choices) > 0 {
			return errors.New("ฉากจบไม่สามารถสร้างทางเลือกต่อได้ กรุณาลบตัวเลือกในฉากนี้ออก หรือเปลี่ยนประเภทฉากเพื่อไปต่อ")
		}
	}

	scene.Type = effectiveType

	if existing.Type == "start" && scene.Type == "ending" {
		return errors.New("ไม่สามารถตั้งค่าฉากเริ่มต้นให้เป็นฉากจบได้ กรุณาเลือกฉากอื่นเป็นฉากจบ")
	}

	return s.repo.UpdateScene(scene)
}

func (s *sceneService) DeleteScene(sceneID int) error {
	scene, err := s.repo.GetSceneByID(sceneID)
	if err != nil {
		return err
	}

	if scene.Type == "start" {
		return errors.New("Start scene cannot be deleted")
	}

	incomingCount, err := s.repo.GetIncomingChoiceCount(sceneID)
	if err != nil {
		return err
	}
	if incomingCount > 0 {
		return errors.New("Cannot delete scene with incoming choices")
	}

	return s.repo.DeleteScene(sceneID)
}

type PublishIssue struct {
	Severity  string // "blocking" or "warning"
	Code      string
	Message   string
	SceneID   *int
	ChapterID *int
}

type PublishValidationResult struct {
	CanPublish bool
	Issues     []PublishIssue
}

func (s *sceneService) ValidateNovelPublishability(novelID int) PublishValidationResult {
	result := PublishValidationResult{
		CanPublish: true,
		Issues:     []PublishIssue{},
	}

	addIssue := func(severity, code, message string, sceneID, chapterID *int) {
		result.Issues = append(result.Issues, PublishIssue{
			Severity:  severity,
			Code:      code,
			Message:   message,
			SceneID:   sceneID,
			ChapterID: chapterID,
		})
		if severity == "blocking" {
			result.CanPublish = false
		}
	}

	nodes, err := s.repo.GetNodesByNovelID(novelID)
	if err != nil {
		addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถโหลดข้อมูลฉากของนิยายได้: %v", err), nil, nil)
		return result
	}

	edges, err := s.repo.GetEdgesByNovelID(novelID)
	if err != nil {
		addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถโหลดข้อมูลทางเลือกของนิยายได้: %v", err), nil, nil)
		return result
	}

	type sceneInfo struct {
		sceneID   int
		chapterID int
		sceneType string
		status    string
	}

	sceneByID := make(map[int]sceneInfo, len(nodes))
	scenesPerChapter := make(map[int]int)

	sceneRows, err := s.db.Query(`
		SELECT scene_id, chapter_id, type, status
		FROM scenes
		WHERE novel_id = $1
		ORDER BY scene_id ASC
	`, novelID)
	if err != nil {
		addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถโหลดสถานะฉากได้: %v", err), nil, nil)
		return result
	}
	defer sceneRows.Close()

	var sceneIDs []int
	for sceneRows.Next() {
		var sID, cID int
		var sType, status string
		if err := sceneRows.Scan(&sID, &cID, &sType, &status); err != nil {
			addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถอ่านข้อมูลฉากได้: %v", err), nil, nil)
			return result
		}
		sceneByID[sID] = sceneInfo{
			sceneID:   sID,
			chapterID: cID,
			sceneType: sType,
			status:    status,
		}
		scenesPerChapter[cID]++
		sceneIDs = append(sceneIDs, sID)
	}
	if err := sceneRows.Err(); err != nil {
		addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถอ่านข้อมูลฉากได้: %v", err), nil, nil)
		return result
	}

	chapterStatus := make(map[int]string)
	var chapterIDs []int
	chapterRows, err := s.db.Query(`
		SELECT chapter_id, status
		FROM chapters
		WHERE novel_id = $1
		ORDER BY chapter_id ASC
	`, novelID)
	if err != nil {
		addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถโหลดตอนของนิยายได้: %v", err), nil, nil)
		return result
	}
	defer chapterRows.Close()

	for chapterRows.Next() {
		var cID int
		var status string
		if err := chapterRows.Scan(&cID, &status); err != nil {
			addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถอ่านข้อมูลตอนได้: %v", err), nil, nil)
			return result
		}
		chapterStatus[cID] = status
		chapterIDs = append(chapterIDs, cID)
	}
	if err := chapterRows.Err(); err != nil {
		addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถอ่านข้อมูลตอนได้: %v", err), nil, nil)
		return result
	}

	var novelIsPublished, novelIsCompleted bool
	err = s.db.QueryRow(`
		SELECT is_published, is_completed
		FROM novels
		WHERE novel_id = $1
	`, novelID).Scan(&novelIsPublished, &novelIsCompleted)
	if err != nil {
		addIssue("blocking", "VALIDATION_ERROR", fmt.Sprintf("ไม่สามารถโหลดข้อมูลนิยายได้: %v", err), nil, nil)
		return result
	}

	outgoingCount := make(map[int]int)
	for _, edge := range edges {
		outgoingCount[edge.FromID]++
	}

	// 1. ENDING_HAS_OUTGOING_CHOICE (Blocking)
	for _, sID := range sceneIDs {
		sc := sceneByID[sID]
		if strings.EqualFold(sc.sceneType, "ending") && outgoingCount[sID] > 0 {
			sceneIDVal := sID
			chapterIDVal := sc.chapterID
			addIssue(
				"blocking",
				"ENDING_HAS_OUTGOING_CHOICE",
				fmt.Sprintf("ฉากจบ (Scene ID %d) มีตัวเลือกชี้ออกจากฉาก กรุณาลบตัวเลือกในฉากจบนี้ออก", sID),
				&sceneIDVal,
				&chapterIDVal,
			)
		}
	}

	// 2. COMPLETED_WITHOUT_ENDING (Blocking)
	hasEndingScene := false
	for _, sc := range sceneByID {
		if strings.EqualFold(sc.sceneType, "ending") {
			hasEndingScene = true
			break
		}
	}
	if novelIsCompleted && !hasEndingScene {
		addIssue(
			"blocking",
			"COMPLETED_WITHOUT_ENDING",
			"นิยายถูกตั้งค่าว่าจบแล้ว (is_completed = true) แต่ยังไม่มีฉากจบ (ending scene) ในเรื่อง กรุณาเพิ่มฉากจบอย่างน้อย 1 ฉาก",
			nil,
			nil,
		)
	}

	// 3. PUBLISHED_SCENE_TO_UNPUBLISHED (removed: Published scene -> draft scene is allowed and must not block publish)

	// 4. SCENE_UNREACHABLE (Warning)
	adjacency := make(map[int][]int)
	for _, edge := range edges {
		adjacency[edge.FromID] = append(adjacency[edge.FromID], edge.ToID)
	}

	var startSceneIDs []int
	for _, sID := range sceneIDs {
		if strings.EqualFold(sceneByID[sID].sceneType, "start") {
			startSceneIDs = append(startSceneIDs, sID)
		}
	}

	if len(startSceneIDs) > 0 {
		reachable := make(map[int]bool)
		queue := make([]int, 0, len(startSceneIDs))
		for _, startID := range startSceneIDs {
			reachable[startID] = true
			queue = append(queue, startID)
		}

		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]

			for _, nextID := range adjacency[curr] {
				if !reachable[nextID] {
					reachable[nextID] = true
					queue = append(queue, nextID)
				}
			}
		}

		for _, sID := range sceneIDs {
			if !reachable[sID] {
				sc := sceneByID[sID]
				sceneIDVal := sID
				chapterIDVal := sc.chapterID
				addIssue(
					"warning",
					"SCENE_UNREACHABLE",
					fmt.Sprintf("ฉาก (Scene ID %d) ไม่สามารถเข้าถึงได้จากฉากเริ่มต้น (start scene)", sID),
					&sceneIDVal,
					&chapterIDVal,
				)
			}
		}
	}

	// 5. CHAPTER_WITHOUT_SCENES (Warning)
	for _, cID := range chapterIDs {
		if scenesPerChapter[cID] == 0 {
			chapterIDVal := cID
			addIssue(
				"warning",
				"CHAPTER_WITHOUT_SCENES",
				fmt.Sprintf("ตอน (Chapter ID %d) ยังไม่มีฉากอยู่ในตอนนี้ กรุณาเพิ่มฉากในตอนหรือลบตอนนี้ออก", cID),
				nil,
				&chapterIDVal,
			)
		}
	}

	// 6. PUBLISHED_SCENE_IN_UNPUBLISHED_CHAPTER (Warning)
	// 7. PUBLISHED_SCENE_IN_UNPUBLISHED_NOVEL (Warning)
	for _, sID := range sceneIDs {
		sc := sceneByID[sID]
		if !strings.EqualFold(sc.status, "published") {
			continue
		}

		cStatus, hasChapter := chapterStatus[sc.chapterID]
		if hasChapter && !strings.EqualFold(cStatus, "published") {
			sceneIDVal := sID
			chapterIDVal := sc.chapterID
			addIssue(
				"warning",
				"PUBLISHED_SCENE_IN_UNPUBLISHED_CHAPTER",
				fmt.Sprintf("ฉากที่เผยแพร่แล้ว (Scene ID %d) อยู่ในตอนที่ยังไม่ได้เผยแพร่ (Chapter ID %d)", sID, sc.chapterID),
				&sceneIDVal,
				&chapterIDVal,
			)
		}

		if !novelIsPublished {
			sceneIDVal := sID
			chapterIDVal := sc.chapterID
			addIssue(
				"warning",
				"PUBLISHED_SCENE_IN_UNPUBLISHED_NOVEL",
				fmt.Sprintf("ฉากที่เผยแพร่แล้ว (Scene ID %d) อยู่ในนิยายที่ยังไม่ได้เผยแพร่ (is_published = false)", sID),
				&sceneIDVal,
				&chapterIDVal,
			)
		}
	}

	// 8. PUBLISHED_CHAPTER_IN_UNPUBLISHED_NOVEL (Warning)
	for _, cID := range chapterIDs {
		cStatus := chapterStatus[cID]
		if strings.EqualFold(cStatus, "published") && !novelIsPublished {
			chapterIDVal := cID
			addIssue(
				"warning",
				"PUBLISHED_CHAPTER_IN_UNPUBLISHED_NOVEL",
				fmt.Sprintf("ตอนที่เผยแพร่แล้ว (Chapter ID %d) อยู่ในนิยายที่ยังไม่ได้เผยแพร่ (is_published = false)", cID),
				nil,
				&chapterIDVal,
			)
		}
	}

	return result
}

func (s *sceneService) ValidateStoryForPublish(novelID int) PublishValidationResult {
	return s.ValidateNovelPublishability(novelID)
}

// wouldCreateCycle ตรวจสอบว่าการเพิ่ม edge
// fromScene -> toScene จะทำให้เกิดวงวนหรือไม่
//
// หลักการ
// 1. สร้าง adjacency list
// 2. เริ่ม DFS จาก toScene
// 3. ถ้าเดินกลับมาถึง fromScene ได้
//    แสดงว่าเพิ่ม edge นี้แล้วจะเกิด cycle

func (s *sceneService) wouldCreateCycle(fromSceneID, toSceneID int, edges []models.SceneEdge) bool {
	if fromSceneID == 0 || toSceneID == 0 || fromSceneID == toSceneID {
		return false
	}

	adjacency := make(map[int][]int)
	for _, edge := range edges {
		adjacency[edge.FromID] = append(adjacency[edge.FromID], edge.ToID)
	}

	visited := make(map[int]bool)
	stack := []int{toSceneID}

	for len(stack) > 0 {
		current := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		if current == fromSceneID {
			return true
		}
		if visited[current] {
			continue
		}
		visited[current] = true

		for _, next := range adjacency[current] {
			if !visited[next] {
				stack = append(stack, next)
			}
		}
	}

	return false
}

func (s *sceneService) CreateChoice(choice models.Choice) (int, error) {
	choice.Label = strings.TrimSpace(choice.Label)

	// 1. ดึงข้อมูลและเช็คการมีอยู่
	fromScene, err := s.repo.GetSceneByID(choice.FromSceneID)
	if err != nil {
		return 0, errors.New("ต้นทาง (from_scene_id) ไม่มีอยู่ในระบบ")
	}
	toScene, err := s.repo.GetSceneByID(choice.ToSceneID)
	if err != nil {
		return 0, errors.New("ปลายทาง (to_scene_id) ไม่มีอยู่ในระบบ")
	}

	// 2. ดัก Logic ความถูกต้อง
	if fromScene.NovelID != toScene.NovelID {
		return 0, errors.New("ไม่สามารถเชื่อมโยงฉากข้ามเรื่องนิยายกันได้")
	}
	if choice.FromSceneID == choice.ToSceneID {
		return 0, errors.New("ฉากต้นทางและปลายทางห้ามเป็นฉากเดียวกัน")
	}

	// เพิ่มเติม: ป้องกันการกดต่อจากฉากที่จบไปแล้ว
	if fromScene.Type == "ending" {
		return 0, errors.New("ฉากต้นทางเป็นฉากจบ ไม่สามารถสร้างทางเลือกต่อไปได้")
	}

	// ป้องกันการสร้างทางเลือกย้อนกลับไปที่จุดเริ่มต้นของเรื่อง
	if toScene.Type == "start" {
		return 0, errors.New("ไม่สามารถสร้างทางเลือกย้อนกลับไปที่จุดเริ่มต้นของเรื่องได้")
	}

	// เช็คการย้อนกลับ (Reverse Choice)
	reverseExists, err := s.repo.CheckChoiceExists(choice.ToSceneID, choice.FromSceneID, "")
	if err != nil {
		return 0, fmt.Errorf("check reverse choice: %w", err)
	}
	if reverseExists {
		return 0, errors.New("ไม่สามารถสร้างทางเลือกย้อนกลับไปยังฉากต้นทางได้")
	}

	// 3. เช็คข้อมูลซ้ำ (Label ซ้ำในเส้นทางเดิม)
	exists, err := s.repo.CheckChoiceExists(choice.FromSceneID, choice.ToSceneID, choice.Label)
	if err != nil {
		return 0, fmt.Errorf("check duplicate choice: %w", err)
	}
	if exists {
		return 0, errors.New("ทางเลือกนี้มีอยู่แล้ว")
	}

	edges, err := s.repo.GetEdgesByNovelID(fromScene.NovelID)
	if err != nil {
		return 0, fmt.Errorf("get edges for cycle validation: %w", err)
	}
	if s.wouldCreateCycle(choice.FromSceneID, choice.ToSceneID, edges) {
		return 0, errors.New("การเชื่อมต่อนี้จะสร้างวงวนในกราฟเรื่องได้")
	}

	return s.repo.CreateChoice(choice)
}

func (s *sceneService) GetChoiceByID(choiceID int) (*models.Choice, error) {
	return s.repo.GetChoiceByID(choiceID)
}

func (s *sceneService) UpdateChoice(choice models.Choice) error {
	choice.Label = strings.TrimSpace(choice.Label)

	existingChoice, err := s.repo.GetChoiceByID(choice.ChoiceID)
	if err != nil {
		return errors.New("ไม่พบทางเลือกที่ต้องการอัปเดต")
	}

	if choice.FromSceneID == 0 {
		choice.FromSceneID = existingChoice.FromSceneID
	}
	if choice.ToSceneID == 0 {
		choice.ToSceneID = existingChoice.ToSceneID
	}

	fromScene, err := s.repo.GetSceneByID(choice.FromSceneID)
	if err != nil {
		return errors.New("ต้นทาง (from_scene_id) ไม่มีอยู่ในระบบ")
	}
	toScene, err := s.repo.GetSceneByID(choice.ToSceneID)
	if err != nil {
		return errors.New("ปลายทาง (to_scene_id) ไม่มีอยู่ในระบบ")
	}

	if fromScene.NovelID != toScene.NovelID {
		return errors.New("ไม่สามารถเชื่อมโยงฉากข้ามเรื่องนิยายกันได้")
	}
	if choice.FromSceneID == choice.ToSceneID {
		return errors.New("ฉากต้นทางและปลายทางห้ามเป็นฉากเดียวกัน")
	}

	// ตรวจ DAG เฉพาะกรณีที่มีการเปลี่ยนต้นทางหรือปลายทาง
	// ถ้าแก้แค่ Label ไม่จำเป็นต้อง DFS ใหม่
	shouldValidateDAG := choice.FromSceneID != existingChoice.FromSceneID || choice.ToSceneID != existingChoice.ToSceneID
	if shouldValidateDAG {
		edges, err := s.repo.GetEdgesByNovelID(fromScene.NovelID)
		if err != nil {
			return fmt.Errorf("get edges for cycle validation: %w", err)
		}

		filteredEdges := make([]models.SceneEdge, 0, len(edges))
		for _, edge := range edges {
			if edge.FromID == existingChoice.FromSceneID &&
				edge.ToID == existingChoice.ToSceneID &&
				edge.Label == existingChoice.Label {
				continue
			}
			filteredEdges = append(filteredEdges, edge)
		}

		if s.wouldCreateCycle(choice.FromSceneID, choice.ToSceneID, filteredEdges) {
			return errors.New("การเชื่อมต่อนี้จะสร้างวงวนในกราฟเรื่องได้")
		}
	}

	return s.repo.UpdateChoice(choice)
}

func (s *sceneService) DeleteChoice(choiceID int) error {
	return s.repo.DeleteChoice(choiceID)
}

func (s *sceneService) SyncSceneChoices(fromSceneID int, rawChoices []interface{}) error {
	existingChoices, err := s.repo.GetChoicesBySceneID(fromSceneID)
	if err != nil {
		return err
	}

	incomingChoiceIDs := map[int]struct{}{}

	for _, raw := range rawChoices {
		choiceMap, ok := raw.(map[string]interface{})
		if !ok {
			continue
		}

		var choice models.Choice
		choice.FromSceneID = fromSceneID

		if idVal, ok := choiceMap["choice_id"]; ok {
			switch v := idVal.(type) {
			case float64:
				choice.ChoiceID = int(v)
			case int:
				choice.ChoiceID = v
			case string:
				if parsed, err := strconv.Atoi(v); err == nil {
					choice.ChoiceID = parsed
				}
			}
		} else if idVal, ok := choiceMap["id"]; ok {
			switch v := idVal.(type) {
			case float64:
				choice.ChoiceID = int(v)
			case int:
				choice.ChoiceID = v
			case string:
				if parsed, err := strconv.Atoi(v); err == nil {
					choice.ChoiceID = parsed
				}
			}
		}

		if labelVal, ok := choiceMap["label"]; ok {
			choice.Label = strings.TrimSpace(fmt.Sprint(labelVal))
		} else if textVal, ok := choiceMap["text"]; ok {
			choice.Label = strings.TrimSpace(fmt.Sprint(textVal))
		}

		if toSceneID, ok := choiceMap["to_scene_id"]; ok {
			switch v := toSceneID.(type) {
			case float64:
				choice.ToSceneID = int(v)
			case int:
				choice.ToSceneID = v
			case string:
				if parsed, err := strconv.Atoi(v); err == nil {
					choice.ToSceneID = parsed
				}
			}
		} else if targetSubScene, ok := choiceMap["targetSubScene"]; ok {
			if str, ok := targetSubScene.(string); ok {
				parts := strings.Split(str, "||")
				if len(parts) == 2 {
					if parsed, err := strconv.Atoi(parts[1]); err == nil {
						choice.ToSceneID = parsed
					}
				}
			}
		}

		if choice.ChoiceID > 0 {
			incomingChoiceIDs[choice.ChoiceID] = struct{}{}
			if err := s.UpdateChoice(choice); err != nil {
				return err
			}
			continue
		}

		// สร้างใหม่เฉพาะเมื่อมีข้อมูลปลายทางและข้อความตัวเลือก
		if choice.Label == "" || choice.ToSceneID == 0 {
			continue
		}

		if _, err := s.CreateChoice(choice); err != nil {
			return err
		}
	}

	for _, existing := range existingChoices {
		if _, ok := incomingChoiceIDs[existing.ChoiceID]; !ok {
			if err := s.DeleteChoice(existing.ChoiceID); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *sceneService) Ping() error {
	return s.db.Ping()
}

func (s *sceneService) GetStoryTree(novelID int, userID int) (models.StoryTreeResponse, error) {
	// 1. ดึง Nodes มาก่อน
	nodes, err := s.repo.GetNodesByNovelIDForUser(novelID, userID)
	if err != nil {
		return models.StoryTreeResponse{}, err
	}

	// ป้องกันกรณีข้อมูลซ้ำจาก query, ให้คงเฉพาะ Scene ID เดียวกันไว้ครั้งเดียว
	uniqueNodes := make([]models.SceneNode, 0, len(nodes))
	seenSceneIDs := make(map[int]struct{}, len(nodes))
	for _, node := range nodes {
		if _, ok := seenSceneIDs[node.ID]; ok {
			continue
		}
		seenSceneIDs[node.ID] = struct{}{}
		uniqueNodes = append(uniqueNodes, node)
	}
	nodes = uniqueNodes

	// 🟢 ดึงชื่อเรื่องนิยายและ Current Scene ID
	var novelTitle string
	var currentSceneID int

	novelErr := s.db.QueryRow(
		`SELECT novel_id, title FROM novels WHERE novel_id = $1`,
		novelID,
	).Scan(&novelID, &novelTitle)

	if novelErr != nil && novelErr != sql.ErrNoRows {
		return models.StoryTreeResponse{}, novelErr
	}

	// 🟢 ถ้ามี userID ให้ดึง current scene จาก reading progress
	if userID > 0 {
		_ = s.db.QueryRow(
			`SELECT current_scene_id FROM reading_progress 
			 WHERE user_id = $1 AND novel_id = $2 AND updated_at IS NOT NULL`,
			userID, novelID,
		).Scan(&currentSceneID)
	}

	// ถ้าไม่มี user_id ส่งมา แปลว่าเรียกจากโหมด writer/preview
	// ให้แสดงโหนดทั้งหมดเป็นปลดล็อก เพื่อให้ผู้เขียนดูโครงสร้างทั้งหมด
	if userID <= 0 {
		for i := range nodes {
			nodes[i].IsUnlocked = true
		}
	}

	// 2. 🟢 สร้าง Map เพื่อจดจำสถานะและข้อมูลฉาก (ประกาศตัวแปรที่นี่)
	unlockedMap := make(map[int]bool)
	sceneInfoMap := make(map[int]models.SceneNode)

	for i := range nodes {
		// จดใส่ Map ไว้ว่า ID นี้ Unlock หรือยัง
		unlockedMap[nodes[i].ID] = nodes[i].IsUnlocked
		sceneInfoMap[nodes[i].ID] = nodes[i]

		// ถ้ายังไม่ Unlock ให้เปลี่ยนชื่อเป็น "🔒..."
		if !nodes[i].IsUnlocked {
			nodes[i].Label = "🔒 ยังไม่ได้ปลดล็อก"
		}
	}

	// 3. ดึง Edges (เส้นเชื่อม)
	edges, err := s.repo.GetEdgesByNovelID(novelID)
	if err != nil {
		return models.StoryTreeResponse{}, err
	}

	// 🎯 สร้างเส้นเชื่อมพร้อมข้อมูลฉากต้นทางและปลายทาง
	enrichedEdges := make([]models.SceneEdge, 0, len(edges))

	for _, edge := range edges {
		toID := edge.ToID
		fromID := edge.FromID

		// ถ้าฉากปลายทางยังไม่เคยถูกปลดล็อก ให้ซ่อนชื่อทางเลือกเป็น ???
		if !unlockedMap[toID] {
			edge.Label = "???"
		}

		// เติมข้อมูลฉากต้นทางและปลายทาง
		fromScene := sceneInfoMap[fromID]
		toScene := sceneInfoMap[toID]

		edge.FromSceneTitle = fromScene.Title
		edge.ToSceneTitle = toScene.Title
		edge.FromChapterTitle = fromScene.ChapterTitle
		edge.ToChapterTitle = toScene.ChapterTitle
		edge.FromChapterEpisode = fromScene.ChapterEpisode
		edge.ToChapterEpisode = toScene.ChapterEpisode
		edge.FromSceneNumberInChapter = fromScene.SceneNumberInChapter
		edge.ToSceneNumberInChapter = toScene.SceneNumberInChapter

		enrichedEdges = append(enrichedEdges, edge)
	}

	secureNodes := make([]models.SceneNode, 0, len(nodes))
	for _, rawNode := range nodes {
		isNodeAccessible := rawNode.IsUnlocked || rawNode.Type == "start"

		node := models.SceneNode{
			ID:             rawNode.ID,
			Type:           rawNode.Type,
			IsUnlocked:     isNodeAccessible,
			ChapterTitle:   rawNode.ChapterTitle,
			ChapterEpisode: rawNode.ChapterEpisode,
			NodeX:          rawNode.NodeX,
			NodeY:          rawNode.NodeY,
		}

		if isNodeAccessible {
			node.Label = rawNode.Label
			if node.Label == "" {
				node.Label = "จุดเริ่มต้นเนื้อเรื่อง"
			}

			node.Title = rawNode.Title
			if node.Title == "" {
				node.Title = "บทนำ / ซีนเปิดตัว"
			}

			if rawNode.Content != "" {
				node.Content = truncateContent(rawNode.Content, 45)
			} else {
				node.Content = "ร่วมเลือกเส้นทางเพื่อดำเนินเนื้อเรื่องต่อไป..."
			}

			if rawNode.Type == "start" {
				node.Status = "start"
			} else if rawNode.Type == "ending" {
				node.Status = "ending_unlocked"
			} else {
				node.Status = "unlocked"
			}
		} else {
			node.Label = "🔒 ยังไม่ได้ปลดล็อก"
			node.Title = "เนื้อเรื่องยังไม่เปิดเผย"
			node.Content = "เดินเรื่องตามเงื่อนไขในฉากก่อนหน้าเพื่อเปิดเผยเส้นทางนี้"
			if rawNode.Type == "ending" {
				node.Status = "ending_locked"
			} else {
				node.Status = "locked"
			}
		}

		secureNodes = append(secureNodes, node)
	}

	return models.StoryTreeResponse{
		NovelTitle:     novelTitle,
		CurrentSceneID: currentSceneID,
		Nodes:          secureNodes,
		Edges:          enrichedEdges,
	}, nil
}

func (s *sceneService) GetEndingsByNovelID(novelID int, userID int) ([]models.EndingScene, error) {
	return s.repo.GetEndingsByNovelIDForUser(novelID, userID)
}

func (s *sceneService) UpdateScenePosition(sceneID int, nodeX *float64, nodeY *float64) error {
	return s.repo.UpdateScenePosition(sceneID, nodeX, nodeY)
}
