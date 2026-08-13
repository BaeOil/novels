package handlers

import (
	"net/http"
	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
	"strconv"
	"strings"
)

// helper ฟังก์ชันสำหรับตัดข้อความเนื้อหานิยายเอามาทำเป็นข้อความสั้นๆ ประจำฉาก (Truncate Content)
func truncateContent(content string, maxLen int) string {
	runes := []rune(content)
	if len(runes) <= maxLen {
		return content
	}
	return string(runes[:maxLen]) + "..."
}

// GetStoryTreeHandler สำหรับดึงโครงสร้าง Node และ Edge ของนิยายทั้งเรื่อง พร้อมคำนวณสถิติและระบบกันสปอยล์
func GetStoryTreeHandler(sceneService service.SceneService, novelService service.NovelService, chapterService service.ChapterService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		novelID, err := extractIDFromPath(r.URL.Path, "/novels/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		// 🔒 ตรวจสอบสิทธิ์: ถ้าเป็นการเรียกจากผู้ใช้ที่ login แล้ว ตรวจสอบเจ้าของหรือ admin
		authUserID, ok := middleware.GetUserIDFromContext(r.Context())
		userIDFromQuery, _ := strconv.Atoi(r.URL.Query().Get("user_id"))
		isOwnerOrAdmin := false
		novelIsPublished := false
		var novelDetail interface{}
		var novelErr error

		if ok && authUserID != 0 {
			// check admin role
			if role, roleOk := middleware.GetRoleFromContext(r.Context()); roleOk && role == "admin" {
				isOwnerOrAdmin = true
			} else if writerService != nil {
				writer, wErr := writerService.GetWriterByUserID(int(authUserID))
				if wErr == nil && writer != nil {
					// check novel ownership by comparing author_id to writer_id
					novelDetail, novelErr = novelService.GetNovelDetail(novelID)
					if novelErr == nil {
						if np, ok := novelDetail.(*models.Novel); ok && np != nil {
							if np.AuthorID == writer.WriterID {
								isOwnerOrAdmin = true
							}
						}
					}
				}
			}
		}

		if novelDetail == nil {
			novelDetail, novelErr = novelService.GetNovelDetail(novelID)
		}
		if novelErr == nil {
			if np, ok := novelDetail.(*models.Novel); ok && np != nil {
				novelIsPublished = np.IsPublished
			}
		}

		userID := userIDFromQuery

		tree, err := sceneService.GetStoryTree(novelID, userID)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err.Error())
			return
		}

		novelTitle := tree.NovelTitle
		if novelTitle == "" {
			novelTitle = "นิยายเรื่องใหม่อันลึกลับ"
		}

		// =================================================================
		// 🎯 แก้ไขส่วนที่ 1: หาค่า currentSceneID เริ่มต้นก่อนการกรอง
		// =================================================================
		currentSceneID := tree.CurrentSceneID
		if currentSceneID == 0 {
			for _, n := range tree.Nodes {
				if n.Type == "start" {
					currentSceneID = n.ID
					break
				}
			}
		}

		// =================================================================
		// 🎯 ปรับปรุงส่วนที่ 2: ลอจิกกรองสปอยล์
		// =================================================================
		secureNodes := make([]models.SceneNode, 0)
		secureNodesMap := make(map[int]bool)

		visitedCount := 0
		totalEndings := 0

		unlockedNodesMap := make(map[int]bool)

		for _, rawNode := range tree.Nodes {
			// 🟢 ดึงสถานะเผยแพร่จริงของฉากนี้เสมอ ไม่ว่าจะเป็น owner/admin หรือผู้อ่านทั่วไป
			// (เดิมดึงเฉพาะตอน !isOwnerOrAdmin เพื่อกรองสปอยล์เท่านั้น ไม่เคยเก็บผลไว้ใช้กับ node เลย
			// ทำให้ node.Status ไม่ถูก set เลยสักครั้ง — พอ frontend fallback ไปเช็ค node.status
			// เจอค่าว่างเสมอ เลยขึ้น "ฉบับร่าง" ทุกฉากไม่ว่าจะเผยแพร่จริงหรือไม่ก็ตาม โดยเฉพาะตอน
			// preview mode ที่ isOwnerOrAdmin เป็น true เสมอ ซึ่งไม่เคยเข้าบล็อกดึงสถานะนี้เลย)
			sceneDetail, errS := sceneService.GetScene(rawNode.ID)
			nodeStatus := "draft"
			if errS == nil && strings.ToLower(sceneDetail.Status) == "published" {
				if chapterDetail, errC := chapterService.GetChapterByID(sceneDetail.ChapterID); errC == nil && chapterDetail != nil && strings.ToLower(chapterDetail.Status) == "published" {
					nodeStatus = "published"
				}
			}

			// หากผู้ใช้ไม่ใช่เจ้าของหรือ admin ให้กรองโหนดที่ไม่ได้เผยแพร่ (พฤติกรรมเดิมทุกประการ
			// แค่ใช้ nodeStatus ที่คำนวณไว้ด้านบนแทนการเช็คซ้ำ)
			if !isOwnerOrAdmin {
				if !novelIsPublished || nodeStatus != "published" {
					continue
				}
			}

			if rawNode.Type == "ending" {
				totalEndings++
			}

			isNodeAccessible := rawNode.IsUnlocked || rawNode.Type == "start"

			if isNodeAccessible {
				unlockedNodesMap[rawNode.ID] = true
			}

			node := models.SceneNode{
				ID:             rawNode.ID,
				Type:           rawNode.Type,
				IsUnlocked:     isNodeAccessible,
				Status:         nodeStatus, // 🟢 ใช้ field ที่มีอยู่แล้วใน struct ไม่ต้องเพิ่มใหม่
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
			} else {
				node.Label = "🔒 ยังไม่ได้ปลดล็อก"
				node.Title = "เนื้อเรื่องยังไม่เปิดเผย"
				node.Content = "เดินเรื่องตามเงื่อนไขในฉากก่อนหน้าเพื่อเปิดเผยเส้นทางนี้"
			}

			secureNodes = append(secureNodes, node)
			secureNodesMap[node.ID] = true
		}

		// =================================================================
		// 🎯 ตรวจสอบความถูกต้องของ currentSceneID หลังการ Filter
		// =================================================================
		if !secureNodesMap[currentSceneID] {
			currentSceneID = 0
			for _, n := range secureNodes {
				if n.Type == "start" {
					currentSceneID = n.ID
					break
				}
			}
			if currentSceneID == 0 && len(secureNodes) > 0 {
				currentSceneID = secureNodes[0].ID
			}
		}

		// =================================================================
		// 🎯 แก้ไขส่วนที่ 3: ใช้ models.SceneEdge ประกาศ Slice ใหม่
		// =================================================================
		secureEdges := make([]models.SceneEdge, 0)
		if tree.Edges != nil {
			for _, edge := range tree.Edges {
				if secureNodesMap[edge.FromID] && secureNodesMap[edge.ToID] {
					secureEdges = append(secureEdges, edge)
				}
			}
		}

		// =================================================================
		// 🎯 ส่วนที่ 4: คำนวณสถิติอิงจาก secureEdges
		// =================================================================
		incomingEdgeCount := make(map[int]int)
		for _, edge := range secureEdges {
			incomingEdgeCount[edge.ToID]++
		}

		for _, node := range secureNodes {
			if incomingEdgeCount[node.ID] == 0 && node.Type != "start" {
				visitedCount++
			}
		}

		totalChoices := len(secureEdges)
		discoveredChoices := 0

		for _, edge := range secureEdges {
			if unlockedNodesMap[edge.FromID] {
				discoveredChoices++
			}
		}

		calculatedStats := models.TreeStats{
			VisitedScenes:     visitedCount,
			TotalScenes:       len(secureNodes),
			DiscoveredChoices: discoveredChoices,
			TotalChoicePoints: totalChoices,
			UnlockedEndings:   0,
			TotalEndings:      totalEndings,
		}

		finalResponse := models.StoryTreeResponse{
			NovelTitle:     novelTitle,
			CurrentSceneID: currentSceneID,
			Stats:          calculatedStats,
			Nodes:          secureNodes,
			Edges:          secureEdges,
		}

		WriteJSON(w, http.StatusOK, finalResponse)
	}
}