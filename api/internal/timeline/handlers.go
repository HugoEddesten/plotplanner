package timeline

import (
	"errors"
	"strconv"
	"time"

	"plotplanner/internal/locals"
	"plotplanner/internal/plants"
	"plotplanner/internal/plots"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

const (
	defaultFeedLimit = 8
	maxFeedLimit     = 50
)

func ListPlotFeed(repo *Repository, plotsRepo *plots.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		plotId, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid plot ID")
		}

		userId := locals.UserId(c)

		if _, err := plotsRepo.FindByIdForUser(plotId, userId); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Plot not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		limit := defaultFeedLimit
		if raw := c.Query("limit"); raw != "" {
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed < 1 {
				return fiber.NewError(fiber.StatusBadRequest, "Invalid limit")
			}
			limit = parsed
		}
		if limit > maxFeedLimit {
			limit = maxFeedLimit
		}

		entries, err := repo.ListForPlot(plotId, limit)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not fetch activity")
		}

		if entries == nil {
			return c.JSON([]FeedEntry{})
		}
		return c.JSON(entries)
	}
}

func ListEntries(repo *Repository, plantsRepo *plants.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		pp, err := plants.FindPlotPlantForUser(c, plantsRepo)
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
		pp, err := plants.FindPlotPlantForUser(c, plantsRepo)
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
		pp, err := plants.FindPlotPlantForUser(c, plantsRepo)
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
		pp, err := plants.FindPlotPlantForUser(c, plantsRepo)
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
