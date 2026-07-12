package handlers

import "testing"

func TestResolveNovelStatus(t *testing.T) {
	tests := []struct {
		name        string
		status      string
		isPublished *bool
		isCompleted *bool
		wantStatus  string
		wantPub     bool
		wantComp    bool
	}{
		{
			name:       "completed published from combined status",
			status:     "completed-published",
			wantStatus: "completed-published",
			wantPub:    true,
			wantComp:   true,
		},
		{
			name:       "completed draft from combined status",
			status:     "completed-draft",
			wantStatus: "completed-draft",
			wantPub:    false,
			wantComp:   true,
		},
		{
			name:        "override from booleans preserves both flags",
			status:      "draft",
			isPublished: boolPtr(true),
			isCompleted: boolPtr(true),
			wantStatus:  "completed-published",
			wantPub:     true,
			wantComp:    true,
		},
		{
			name:        "published without completion stays published",
			status:      "draft",
			isPublished: boolPtr(true),
			wantStatus:  "published",
			wantPub:     true,
			wantComp:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotStatus, gotPub, gotComp := resolveNovelStatus(tt.status, tt.isPublished, tt.isCompleted)
			if gotStatus != tt.wantStatus || gotPub != tt.wantPub || gotComp != tt.wantComp {
				t.Fatalf("resolveNovelStatus(%q, pub=%v, comp=%v) = (%q, %v, %v), want (%q, %v, %v)", tt.status, tt.isPublished, tt.isCompleted, gotStatus, gotPub, gotComp, tt.wantStatus, tt.wantPub, tt.wantComp)
			}
		})
	}
}

func boolPtr(v bool) *bool {
	return &v
}
