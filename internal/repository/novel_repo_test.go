package repository

import (
	"testing"
)

func TestStatusPublishedHiddenDoesNotMatchPublishedFilter(t *testing.T) {
	if matchesStatusFilter("published", false, "approved", "published") {
		t.Fatal("status=published with is_published=false must not appear in published filter")
	}
}

func TestStatusCompletedPublishedVisibleMatchesPublishedFilter(t *testing.T) {
	if !matchesStatusFilter("completed-published", true, "approved", "published") {
		t.Fatal("status=completed-published with is_published=true and approved writer must appear in published filter")
	}
}

func TestWriterRevokedDoesNotMatchPublishedFilter(t *testing.T) {
	if matchesStatusFilter("completed-published", true, "revoked", "published") {
		t.Fatal("revoked writer must not appear in published filter even if novel is visible")
	}
}

func TestStatusSuspendedMatchesOnlySuspendedAndAllFilters(t *testing.T) {
	if !matchesStatusFilter("suspended", true, "approved", "suspended") {
		t.Fatal("status=suspended must appear in suspended filter")
	}
	if !matchesStatusFilter("suspended", true, "approved", "all") {
		t.Fatal("status=suspended must appear in all filter")
	}
	if matchesStatusFilter("suspended", true, "approved", "published") {
		t.Fatal("status=suspended must not appear in published filter")
	}
}

func TestBuildNovelWhereClauseHandlesEmptyFilters(t *testing.T) {
	clause := buildNovelWhereClause(nil)
	if clause != "" {
		t.Fatalf("empty filters should produce empty WHERE clause, got: %s", clause)
	}
}
