package auth

import (
	"errors"
	"fmt"
	"log"
	"os"

	"plotplanner/internal/email"
	"plotplanner/internal/invites"
	"plotplanner/internal/jwt"
	"plotplanner/internal/plots"
	"plotplanner/internal/users"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

func Register(userRepo *users.Repository, plotRepo *plots.Repository, inviteRepo *invites.Repository, emailSvc email.EmailService, jwtService *jwt.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ctx := c.UserContext()

		body := new(AuthRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}

		if len(body.Email) < 5 || len(body.Password) < 5 {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not hash password")
		}

		userId, err := userRepo.Create(body.Email, string(hashed))
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Email already exists")
		}

		// Redeem any pending plot invites for this email.
		pendingInvites, err := inviteRepo.FindPendingByEmail(ctx, body.Email)
		if err != nil {
			log.Printf("register: failed to fetch pending invites for %s: %v", body.Email, err)
		} else {
			for _, inv := range pendingInvites {
				if _, err := plotRepo.AddUserToPlot(inv.PlotId, userId); err != nil {
					log.Printf("register: failed to add user %d to plot %d: %v", userId, inv.PlotId, err)
					continue
				}
				if err := inviteRepo.Accept(ctx, inv.Id); err != nil {
					log.Printf("register: failed to accept invite %d: %v", inv.Id, err)
				}
			}
		}

		go emailSvc.SendWelcome(ctx, body.Email)

		token, _ := jwtService.GenerateToken(userId, body.Email)

		c.Cookie(&fiber.Cookie{
			Name:     "auth",
			Value:    token,
			HTTPOnly: true,
			Secure:   true,
			SameSite: fiber.CookieSameSiteNoneMode,
			Path:     "/",
		})

		return c.SendStatus(200)
	}
}

func Login(repo *users.Repository, jwtService *jwt.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		body := new(AuthRequest)

		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}

		user, err := repo.FindByEmail(body.Email)

		if err != nil || user == nil {
			return fiber.NewError(fiber.StatusUnauthorized, "Invalid email or password")
		}

		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password))
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "Invalid email or password")
		}

		token, err := jwtService.GenerateToken(user.Id, user.Email)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "could not generate token"})
		}

		c.Cookie(&fiber.Cookie{
			Name:     "auth",
			Value:    token,
			HTTPOnly: true,
			Secure:   true,
			SameSite: fiber.CookieSameSiteNoneMode,
			Path:     "/",
		})

		return c.SendStatus(200)
	}
}

func Logout() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Cookie(&fiber.Cookie{
			Name:     "auth",
			Value:    "",
			HTTPOnly: true,
			Secure:   true,
			SameSite: fiber.CookieSameSiteNoneMode,
			Path:     "/",
			MaxAge:   -1,
		})
		return c.SendStatus(fiber.StatusOK)
	}
}

func Me(repo *users.Repository, jwtService *jwt.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authCookie := c.Cookies("auth")

		claims, err := jwtService.ValidateToken(authCookie)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "Invalid cookie")
		}

		return c.JSON(fiber.Map{
			"userId": claims.UserId,
			"email":  claims.Email,
		})
	}
}

func ResetPassword(repo *users.Repository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Params("token")

		body := new(ResetPasswordRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}
		if len(body.Password) < 8 {
			return fiber.NewError(fiber.StatusBadRequest, "Password needs to be at least 8 characters long")
		}

		reset, err := repo.FindPasswordResetByToken(token)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return fiber.NewError(fiber.StatusBadRequest, "Invalid or expired reset link")
			}
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		if err := repo.ConsumePasswordReset(reset.Id, reset.UserId, string(hashed)); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError)
		}

		return c.SendStatus(fiber.StatusOK)
	}
}

func SendResetPasswordEmail(repo *users.Repository, emailSvc email.EmailService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ctx := c.UserContext()

		body := new(SendResetPasswordRequest)
		if err := c.BodyParser(body); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid request")
		}

		user, err := repo.FindByEmail(body.Email)

		if err == nil {
			passwordReset, err := repo.CreatePasswordReset(user.Id)
			if err != nil {
				return fiber.NewError(fiber.StatusInternalServerError)
			}

			appURL := os.Getenv("APP_URL")
			if appURL == "" {
				appURL = "http://localhost:5173"
			}
			resetLink := fmt.Sprintf("%s/reset-password/%s", appURL, passwordReset.Token)

			emailSvc.SendResetPassword(ctx, user.Email, resetLink)
		}

		return c.SendStatus(fiber.StatusOK)
	}
}
