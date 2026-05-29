package jwt

import (
	"plotplanner/internal/locals"

	"github.com/gofiber/fiber/v2"
)

func Protected(jwtService *JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := c.Cookies("auth")
		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing auth cookie",
			})
		}

		claims, err := jwtService.ValidateToken(tokenStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		locals.SetUserId(c, claims.UserId)
		locals.SetEmail(c, claims.Email)

		return c.Next()
	}
}
