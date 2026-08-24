package plants

import (
	"errors"
	"strconv"

	"plotplanner/internal/locals"
	"plotplanner/internal/plots"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

func SearchPlants(repo *Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		q := c.Query("q")
		userId := locals.UserId(c)

		results, err := repo.ListAll(userId, q)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not search plants")
		}

		if results == nil {
			return c.JSON([]Plant{})
		}
		return c.JSON(results)
	}
}

func PlantOnCell(repo *Repository, plotRepo *plots.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		plotId, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid plot ID")
		}

		userId := locals.UserId(c)

		if _, err := plotRepo.FindByIdForUser(plotId, userId); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Plot not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		body := new(PlantPlotRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}

		if body.Col < 0 || body.Row < 0 {
			return fiber.NewError(fiber.StatusBadRequest, "col and row must be non-negative")
		}
		if body.PlantId == nil && body.Name == "" {
			return fiber.NewError(fiber.StatusBadRequest, "plant_id or name is required")
		}

		var plantId *int
		var userPlantId *int

		if body.Name != "" {
			id, err := repo.FindOrCreateUserPlant(userId, body.Name)
			if err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "Could not resolve plant")
			}
			userPlantId = &id
		} else {
			plantId = body.PlantId
		}

		pp, err := repo.PlantOnCell(plotId, plantId, userPlantId, body.Col, body.Row)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not plant on cell")
		}

		return c.JSON(pp)
	}
}

func ListPlotPlants(repo *Repository, plotRepo *plots.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		plotId, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid plot ID")
		}

		userId := locals.UserId(c)

		if _, err := plotRepo.FindByIdForUser(plotId, userId); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Plot not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		plotPlants, err := repo.ListForPlot(plotId)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not fetch plants")
		}

		if plotPlants == nil {
			return c.JSON([]PlotPlant{})
		}
		return c.JSON(plotPlants)
	}
}

func RemoveFromCell(repo *Repository, plotRepo *plots.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		plotId, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid plot ID")
		}

		userId := locals.UserId(c)

		if _, err := plotRepo.FindByIdForUser(plotId, userId); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Plot not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		col, err := strconv.Atoi(c.Query("col"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid col")
		}
		row, err := strconv.Atoi(c.Query("row"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid row")
		}

		if err := repo.RemoveFromCell(plotId, col, row); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not remove plant")
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}
