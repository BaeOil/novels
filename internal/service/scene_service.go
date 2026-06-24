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
		Content:           scene.Content,
		Type:              scene.Type,
		ImageURL:          s.formatImageURL(scene.ImageURL),
		EndingTitle:       scene.EndingTitle,
		EndingType:        scene.EndingType,
		EndingDescription: scene.EndingDescription,
		NovelTitle:        scene.NovelTitle,   // 🟢 🎯 ยัดชื่อเรื่องหลักส่งไปหน้าบ้าน
		ChapterTitle:      scene.ChapterTitle, // 🟢 🎯 ยัดชื่อตอนย่อยส่งไปหน้าบ้าน
		SceneTitle:        scene.Title,        // 🟢 🎯 ส่งชื่อฉากย่อยไปด้วยครับน้า
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
		Content:           scene.Content,
		Type:              scene.Type,
		ImageURL:          s.formatImageURL(scene.ImageURL),
		EndingTitle:       scene.EndingTitle,
		EndingType:        scene.EndingType,
		EndingDescription: scene.EndingDescription,
		NovelTitle:        scene.NovelTitle,   // 🟢 🎯 ยัดชื่อเรื่องหลักส่งไปหน้าบ้าน
		ChapterTitle:      scene.ChapterTitle, // 🟢 🎯 ยัดชื่อตอนย่อยส่งไปหน้าบ้าน
		SceneTitle:        scene.Title,        // 🟢 🎯 ส่งชื่อฉากย่อย
		Choices:           choices,
	}, nil
}

func (s *sceneService) GetScenesByChapterID(chapterID int) ([]models.Scene, error) {
	return s.repo.GetScenesByChapterID(chapterID)
}

func (s *sceneService) CreateScene(scene models.Scene) (int, error) {
	// ตัดช่องว่างหน้า-หลังชื่อฉาก ป้องกัน "ฉากที่ 1" กับ "ฉากที่ 1 " ซ้ำกัน
	scene.Title = strings.TrimSpace(scene.Title)

	count, err := s.repo.CountScenesInNovel(scene.NovelID)
	if err != nil {
		return 0, err
	}

	// Logic: ถ้าเป็นฉากแรกของเรื่อง ให้เป็น start เสมอ
	if count == 0 {
		scene.Type = "start"
	} else if strings.EqualFold(scene.Type, "start") {
		// Reject duplicate start scene
		return 0, errors.New("Novel already has a start scene")
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

	// Validation: Prevent start scene from becoming an ending
	if existing.Type == "start" && scene.Type == "ending" {
		return errors.New("Start scene cannot be an ending scene")
	}

	if scene.Title != "" {
		scene.Title = strings.TrimSpace(scene.Title)
	} else {
		scene.Title = existing.Title
	}

	if scene.Content == "" {
		scene.Content = existing.Content
	}

	if scene.Type == "" {
		scene.Type = existing.Type
	} else if existing.Type == "start" {
		// Force start scene to remain start
		scene.Type = "start"
	}

	// Validation: Prevent ending scene from having outgoing choices
	effectiveType := scene.Type
	if effectiveType == "" {
		effectiveType = existing.Type
	}
	if effectiveType == "ending" {
		choices, err := s.repo.GetChoicesBySceneID(scene.SceneID)
		if err == nil && len(choices) > 0 {
			return errors.New("Ending scene cannot have outgoing choices")
		}
	}

	return s.repo.UpdateScene(scene)
}

func (s *sceneService) DeleteScene(sceneID int) error {
	_, err := s.repo.GetSceneByID(sceneID)
	if err != nil {
		return err
	}
	return s.repo.DeleteScene(sceneID)
}

func (s *sceneService) ValidateStoryForPublish(novelID int) error {
	// Get all scenes for this novel
	nodes, err := s.repo.GetNodesByNovelID(novelID)
	if err != nil {
		return err
	}

	// Get all edges (choices) for this novel
	edges, err := s.repo.GetEdgesByNovelID(novelID)
	if err != nil {
		return err
	}

	// Build map of outgoing choice counts for each scene
	outgoingCount := make(map[int]int)
	for _, edge := range edges {
		outgoingCount[edge.FromID]++
	}

	// Find start and ending scenes
	var startScene *models.SceneNode
	endingScenes := make([]*models.SceneNode, 0)

	for i := range nodes {
		if nodes[i].Type == "start" {
			startScene = &nodes[i]
		} else if nodes[i].Type == "ending" {
			endingScenes = append(endingScenes, &nodes[i])
		}
	}

	// Validation 1: Start scene must have at least 1 outgoing choice
	if startScene == nil {
		return errors.New("Story must have a start scene")
	}
	if startScene.ID > 0 {
		if outgoingCount[startScene.ID] < 1 {
			return errors.New("Start scene must have at least one choice")
		}
	}

	// Validation 2: Ending scenes must have 0 outgoing choices
	for _, ending := range endingScenes {
		if ending.ID > 0 {
			if outgoingCount[ending.ID] > 0 {
				return errors.New("Ending scene cannot have outgoing choices")
			}
		}
	}

	return nil
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
	reverseExists, _ := s.repo.CheckChoiceExists(choice.ToSceneID, choice.FromSceneID, "")
	if reverseExists {
		return 0, errors.New("ไม่สามารถสร้างทางเลือกย้อนกลับไปยังฉากต้นทางได้")
	}

	// 3. เช็คข้อมูลซ้ำ (Label ซ้ำในเส้นทางเดิม)
	exists, _ := s.repo.CheckChoiceExists(choice.FromSceneID, choice.ToSceneID, choice.Label)
	if exists {
		return 0, errors.New("ทางเลือกนี้มีอยู่แล้ว")
	}

	return s.repo.CreateChoice(choice)
}

func (s *sceneService) UpdateChoice(choice models.Choice) error {
	choice.Label = strings.TrimSpace(choice.Label)

	if choice.FromSceneID == 0 {
		existingChoice, err := s.repo.GetChoiceByID(choice.ChoiceID)
		if err != nil {
			return errors.New("ไม่พบทางเลือกที่ต้องการอัปเดต")
		}
		choice.FromSceneID = existingChoice.FromSceneID
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
			`SELECT COALESCE(current_scene_id, 1) FROM reading_progress 
			 WHERE user_id = $1 AND novel_id = $2`,
			userID, novelID,
		).Scan(&currentSceneID)
	}

	// ถ้ายังหา current scene ไม่ได้ ให้เอา start scene
	if currentSceneID == 0 {
		_ = s.db.QueryRow(
			`SELECT scene_id FROM scenes WHERE novel_id = $1 AND type = 'start' LIMIT 1`,
			novelID,
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
