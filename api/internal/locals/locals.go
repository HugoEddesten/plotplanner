package locals

import "github.com/gofiber/fiber/v2"

func UserId(c *fiber.Ctx) int   { return c.Locals("userId").(int) }
func Email(c *fiber.Ctx) string { return c.Locals("email").(string) }
func PlotId(c *fiber.Ctx) int   { return c.Locals("plotId").(int) }

func SetUserId(c *fiber.Ctx, v int)   { c.Locals("userId", v) }
func SetEmail(c *fiber.Ctx, v string) { c.Locals("email", v) }
func SetPlotId(c *fiber.Ctx, v int)   { c.Locals("plotId", v) }
