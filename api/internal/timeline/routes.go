package timeline

import (
	"plotplanner/internal/plants"
	"plotplanner/internal/plots"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App, repo *Repository, plantsRepo *plants.Repository, plotsRepo *plots.Repository, jwtMiddleware fiber.Handler) {
	g := app.Group("/plots/:id/plants/:plantId/timeline", jwtMiddleware)
	g.Get("/", ListEntries(repo, plantsRepo))
	g.Post("/", CreateEntry(repo, plantsRepo))
	g.Put("/:entryId", UpdateEntry(repo, plantsRepo))
	g.Delete("/:entryId", DeleteEntry(repo, plantsRepo))

	app.Get("/plots/:id/timeline", jwtMiddleware, ListPlotFeed(repo, plotsRepo))
}
