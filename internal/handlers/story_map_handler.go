package handlers

import (
	"net/http"
	"novel-be/internal/middleware"
	"novel-be/internal/models"
	"novel-be/internal/service"
	"strconv"
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
func GetStoryTreeHandler(sceneService service.SceneService, novelService service.NovelService, writerService service.WriterService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		novelID, err := extractIDFromPath(r.URL.Path, "/novels/")
		if err != nil {
			WriteError(w, http.StatusBadRequest, "invalid novel id")
			return
		}

		// 🔒 ตรวจสอบสิทธิ์: ถ้าเป็นการเรียกจากผู้ใช้ที่ login แล้ว ต้องเช็คว่านิยายนี้เป็นของเขาหรือเปล่า
		authUserID, ok := middleware.GetUserIDFromContext(r.Context())
		userIDFromQuery, _ := strconv.Atoi(r.URL.Query().Get("user_id"))
		if ok && authUserID != 0 {
			// ผู้ใช้ logged in - ต้องตรวจสอบ ownership (สำหรับไปที่ writer's story tree view)
			writer, err := writerService.GetWriterByUserID(int(authUserID))
			if err == nil && writer != nil {
				// เป็นนักเขียน - ตรวจสอบว่านิยายเป็นของเขา
				novelDetail, err := novelService.GetNovelDetail(novelID)
				if err == nil {
					novelPtr, ok := novelDetail.(*models.Novel)
					if ok && novelPtr != nil && novelPtr.AuthorID != writer.WriterID {
						WriteError(w, http.StatusForbidden, "forbidden: คุณไม่มีสิทธิ์ดูแผนผังนิยายเรื่องนี้")
						return
					}
				}
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

		currentSceneID := tree.CurrentSceneID
		if currentSceneID == 0 {
			currentSceneID = 1
		}

		// =================================================================
		// 🎯 ปรับปรุงส่วนที่ 2: ลอจิกกรองสปอยล์ และแก้ไขบั๊กโหนดแรกว่างเปล่า
		// =================================================================
		var secureNodes []models.SceneNode

		visitedCount := 0
		totalScenes := len(tree.Nodes)
		totalEndings := 0

		unlockedNodesMap := make(map[int]bool)

		for _, rawNode := range tree.Nodes {
			if rawNode.Type == "ending" {
				totalEndings++
			}

			// 🎯 บังคับเปิดไฟ: ถ้าเป็นโหนดที่ปลดล็อกแล้ว หรือเป็นโหนดไอดี 1 หรือไทป์สตาร์ท
			isNodeAccessible := rawNode.IsUnlocked || rawNode.ID == 1 || rawNode.Type == "start"

			if isNodeAccessible {
				unlockedNodesMap[rawNode.ID] = true
			}

			node := models.SceneNode{
				ID:             rawNode.ID,
				Type:           rawNode.Type,
				IsUnlocked:     isNodeAccessible,
				ChapterTitle:   rawNode.ChapterTitle,
				ChapterEpisode: rawNode.ChapterEpisode,
			}

			if isNodeAccessible {
				// 🎯 ซ่อมบั๊กค่าว่าง: ถ้าปลดล็อกแล้วแต่ค่าจาก DB ดันว่าง ให้ใส่ค่าเริ่มต้นให้เลยครับน้า หน้าบ้านจะได้ไม่พัง
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
				// ระบบกันสปอยล์สำหรับโหนดที่ผู้เล่นยังเดินไปไม่ถึง
				node.Label = "🔒 ยังไม่ได้ปลดล็อก"
				node.Title = "เนื้อเรื่องยังไม่เปิดเผย"
				node.Content = "เดินเรื่องตามเงื่อนไขในฉากก่อนหน้าเพื่อเปิดเผยเส้นทางนี้"
			}

			secureNodes = append(secureNodes, node)
		}

		// =================================================================
		// 🎯 ส่วนที่ 3: คำนวณสถิติสำหรับผู้เขียน
		// =================================================================
		// นับฉากที่ไม่มี incoming edge และไม่ใช่ start scene
		incomingEdgeCount := make(map[int]int)
		for _, edge := range tree.Edges {
			incomingEdgeCount[edge.ToID]++
		}

		for _, node := range tree.Nodes {
			// นับฉากที่ไม่มี incoming edge และไม่ใช่ start scene
			if incomingEdgeCount[node.ID] == 0 && node.Type != "start" {
				visitedCount++
			}
		}

		totalChoices := len(tree.Edges)
		discoveredChoices := 0

		for _, edge := range tree.Edges {
			if unlockedNodesMap[edge.FromID] {
				discoveredChoices++
			}
		}

		calculatedStats := models.TreeStats{
			VisitedScenes:     visitedCount,
			TotalScenes:       totalScenes,
			DiscoveredChoices: discoveredChoices,
			TotalChoicePoints: totalChoices,
			UnlockedEndings:   0, // ไม่ใช้สำหรับผู้เขียน
			TotalEndings:      totalEndings,
		}

		finalResponse := models.StoryTreeResponse{
			NovelTitle:     novelTitle,
			CurrentSceneID: currentSceneID,
			Stats:          calculatedStats,
			Nodes:          secureNodes,
			Edges:          tree.Edges,
		}

		WriteJSON(w, http.StatusOK, finalResponse)
	}
}
