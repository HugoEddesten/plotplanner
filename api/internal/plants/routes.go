package plants

import (
	"plotplanner/internal/plots"

	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App, repo *Repository, plotsRepo *plots.Repository, jwtMiddleware fiber.Handler) {
	g := app.Group("/plants", jwtMiddleware)
	g.Get("/", SearchPlants(repo))

	plotGroup := app.Group("/plots/:id/plants", jwtMiddleware)
	plotGroup.Get("/", ListPlotPlants(repo, plotsRepo))
	plotGroup.Get("/archived", ListArchivedPlotPlants(repo, plotsRepo))
	plotGroup.Post("/", PlantOnCell(repo, plotsRepo))
	plotGroup.Post("/:plantId/archive", ArchivePlotPlant(repo))
	plotGroup.Delete("/", RemoveFromCell(repo, plotsRepo))
}
