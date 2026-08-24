package timeline

import (
	"errors"
	"strconv"
	"time"

	"plotplanner/internal/locals"
	"plotplanner/internal/plants"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

// findPlotPlant resolves and authorizes the plot_plant referenced by the
// :id (plot) and :plantId (plot_plant) route params for the current user.
func findPlotPlant(c *fiber.Ctx, plantsRepo *plants.Repository) (*plants.PlotPlant, error) {
	plotId, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Invalid plot ID")
	}
	plotPlantId, err := strconv.Atoi(c.Params("plantId"))
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Invalid plant ID")
	}

	userId := locals.UserId(c)

	pp, err := plantsRepo.FindByIdForUser(plotPlantId, userId)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fiber.NewError(fiber.StatusNotFound, "Plant not found")
		}
		return nil, fiber.NewError(fiber.StatusInternalServerError)
	}
	if pp.PlotId != plotId {
		return nil, fiber.NewError(fiber.StatusNotFound, "Plant not found")
	}

	return pp, nil
}

func ListEntries(repo *Repository, plantsRepo *plants.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		pp, err := findPlotPlant(c, plantsRepo)
		if err != nil {
			return err
		}

		entries, err := repo.ListForPlotPlant(pp.Id)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not fetch timeline")
		}

		if entries == nil {
			return c.JSON([]Entry{})
		}
		return c.JSON(entries)
	}
}

func CreateEntry(repo *Repository, plantsRepo *plants.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		pp, err := findPlotPlant(c, plantsRepo)
		if err != nil {
			return err
		}

		body := new(CreateEntryRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}

		eventType := EventType(body.EventType)
		if eventType == "" {
			eventType = EventComment
		}
		if !eventType.Valid() {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid event_type")
		}

		eventDate := time.Now()
		if body.EventDate != nil {
			eventDate = *body.EventDate
		}

		entry, err := repo.Create(pp.Id, string(eventType), eventDate, body.Notes)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not create timeline entry")
		}

		return c.Status(fiber.StatusCreated).JSON(entry)
	}
}

func UpdateEntry(repo *Repository, plantsRepo *plants.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		pp, err := findPlotPlant(c, plantsRepo)
		if err != nil {
			return err
		}

		entryId, err := strconv.Atoi(c.Params("entryId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid entry ID")
		}

		body := new(UpdateEntryRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}

		eventType := EventType(body.EventType)
		if eventType == "" {
			eventType = EventComment
		}
		if !eventType.Valid() {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid event_type")
		}

		entry, err := repo.Update(entryId, pp.Id, string(eventType), body.EventDate, body.Notes)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Timeline entry not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, "Could not update timeline entry")
		}

		return c.JSON(entry)
	}
}

func DeleteEntry(repo *Repository, plantsRepo *plants.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		pp, err := findPlotPlant(c, plantsRepo)
		if err != nil {
			return err
		}

		entryId, err := strconv.Atoi(c.Params("entryId"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid entry ID")
		}

		if err := repo.Delete(entryId, pp.Id); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Timeline entry not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, "Could not delete timeline entry")
		}

		return c.SendStatus(fiber.StatusNoContent)
	}
}
