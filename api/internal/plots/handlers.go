package plots

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"plotplanner/internal/email"
	"plotplanner/internal/invites"
	"plotplanner/internal/locals"
	"plotplanner/internal/users"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func CreatePlot(repo *Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		body := new(CreatePlotRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}
		if len(body.Name) == 0 {
			return fiber.NewError(fiber.StatusBadRequest, "Name is required")
		}

		plotId, err := repo.Create(body.Name, body.Shape)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not create plot")
		}

		userId := locals.UserId(c)
		if _, err := repo.AddUserToPlot(plotId, userId); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not add user to plot")
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"id":   plotId,
			"name": body.Name,
		})
	}
}

func ListPlots(repo *Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userId := locals.UserId(c)

		plots, err := repo.ListByUserId(userId)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not fetch plots")
		}

		return c.JSON(plots)
	}
}

func GetPlot(repo *Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		plotId, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid plot ID")
		}

		userId := locals.UserId(c)

		plot, err := repo.FindByIdForUser(plotId, userId)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Plot not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError, "Could not fetch plot")
		}

		return c.JSON(plot)
	}
}

func InviteToPlot(plotRepo *Repository, userRepo *users.Repository, inviteRepo *invites.Repository, emailSvc email.EmailService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ctx := c.UserContext()

		plotId, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid plot ID")
		}

		body := new(InviteRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}
		if body.Email == "" {
			return fiber.NewError(fiber.StatusBadRequest, "Email is required")
		}

		userId := locals.UserId(c)

		plot, err := plotRepo.FindByIdForUser(plotId, userId)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Plot not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		invite, err := inviteRepo.Create(ctx, plotId, userId, body.Email)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not create invite")
		}

		appURL := os.Getenv("APP_URL")
		if appURL == "" {
			appURL = "http://localhost:5173"
		}

		var inviteURL string
		existingUser, err := userRepo.FindByEmail(body.Email)
		if err == nil && existingUser != nil {
			inviteURL = fmt.Sprintf("%s/login?invite=%s", appURL, invite.Token)
		} else {
			inviteURL = fmt.Sprintf("%s/register?invite=%s", appURL, invite.Token)
		}

		go emailSvc.SendplotInvite(ctx, body.Email, plot.Name, inviteURL)

		return c.SendStatus(fiber.StatusOK)
	}
}

func GetInviteInfo(inviteRepo *invites.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Params("token")

		info, err := inviteRepo.FindInfoByToken(c.UserContext(), token)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Invite not found or expired")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		return c.JSON(info)
	}
}

func ListInvites(inviteRepo *invites.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userEmail := locals.Email(c)

		pending, err := inviteRepo.FindPendingByEmail(c.UserContext(), userEmail)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not fetch invites")
		}

		return c.JSON(pending)
	}
}

func AcceptPlotInvite(plotRepo *Repository, inviteRepo *invites.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ctx := c.UserContext()
		token := c.Params("token")

		invite, err := inviteRepo.FindByToken(ctx, token)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Invite not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		if time.Now().After(invite.ExpiresAt) {
			return fiber.NewError(fiber.StatusGone, "Invite has expired")
		}
		if invite.AcceptedAt != nil {
			return fiber.NewError(fiber.StatusConflict, "Invite already accepted")
		}
		if invite.DeclinedAt != nil {
			return fiber.NewError(fiber.StatusConflict, "Invite already declined")
		}

		if invite.Email != locals.Email(c) {
			return fiber.NewError(fiber.StatusForbidden, "This invite is for a different email address")
		}

		userId := locals.UserId(c)
		if _, err := plotRepo.AddUserToPlot(invite.PlotId, userId); err != nil {
			var pgErr *pgconn.PgError
			if !(errors.As(err, &pgErr) && pgErr.Code == "23505") {
				return fiber.NewError(fiber.StatusInternalServerError, "Could not add user to plot")
			}
		}

		if err := inviteRepo.Accept(ctx, invite.Id); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		return c.SendStatus(fiber.StatusOK)
	}
}

func DeclinePlotInvite(inviteRepo *invites.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ctx := c.UserContext()
		token := c.Params("token")

		invite, err := inviteRepo.FindByToken(ctx, token)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusNotFound, "Invite not found")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		if invite.AcceptedAt != nil || invite.DeclinedAt != nil {
			return fiber.NewError(fiber.StatusConflict, "Invite already responded to")
		}

		if invite.Email != locals.Email(c) {
			return fiber.NewError(fiber.StatusForbidden, "This invite is for a different email address")
		}

		if err := inviteRepo.Decline(ctx, invite.Id); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		return c.SendStatus(fiber.StatusOK)
	}
}
