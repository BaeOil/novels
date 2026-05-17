package service

import (
	"database/sql"
	"errors"
	"novel-be/internal/models"
	"novel-be/internal/repository"
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
	} else if scene.Type == "" {
		scene.Type = "normal"
	}

	exists, _ := s.repo.CheckSceneExists(scene.ChapterID, scene.Title)
	if exists {
		return 0, errors.New("ฉากนี้มีอยู่แล้วในตอนเดียวกัน")
	}
	return s.repo.CreateScene(scene)
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

func (s *sceneService) Ping() error {
	return s.db.Ping()
}

func (s *sceneService) GetStoryTree(novelID int, userID int) (models.StoryTreeResponse, error) {
	// 1. ดึง Nodes มาก่อน
	nodes, err := s.repo.GetNodesByNovelIDForUser(novelID, userID)
	if err != nil {
		return models.StoryTreeResponse{}, err
	}

	// 2. 🟢 สร้าง Map เพื่อจดจำสถานะ (ประกาศตัวแปรที่นี่)
	unlockedMap := make(map[int]bool)

	for i := range nodes {
		// จดใส่ Map ไว้ว่า ID นี้ Unlock หรือยัง
		unlockedMap[nodes[i].ID] = nodes[i].IsUnlocked

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

	// 4. 🟢 ใช้ unlockedMap ที่สร้างไว้ด้านบน มาเช็คเพื่อซ่อน Label บนเส้น
	for i := range edges {
		toID := edges[i].ToID

		// ถ้าฉากปลายทางยังไม่เคยถูกปลดล็อก ให้ซ่อนชื่อทางเลือกเป็น ???
		if !unlockedMap[toID] {
			edges[i].Label = "???"
		}
	}

	return models.StoryTreeResponse{
		Nodes: nodes,
		Edges: edges,
	}, nil
}
