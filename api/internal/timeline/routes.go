package timeline

import (
	"plotplanner/internal/plants"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App, repo *Repository, plantsRepo *plants.Repository, jwtMiddleware fiber.Handler) {
	g := app.Group("/plots/:id/plants/:plantId/timeline", jwtMiddleware)
	g.Get("/", ListEntries(repo, plantsRepo))
	g.Post("/", CreateEntry(repo, plantsRepo))
	g.Put("/:entryId", UpdateEntry(repo, plantsRepo))
	g.Delete("/:entryId", DeleteEntry(repo, plantsRepo))
}
