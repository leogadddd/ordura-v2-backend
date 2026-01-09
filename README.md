# ordura-v2

## Sales & Orders Schema

This backend uses Prisma with PostgreSQL. The `Order`, `OrderItem`, and `Payment` models are designed to keep historical sales accurate without hard foreign keys to `Product`.

- Snapshot product data on `OrderItem` (e.g., `name`, `sku`, `unitPrice`, `taxRate`), so past orders remain consistent even if products change later.
- Use decimal monetary fields (`@db.Decimal`) to avoid floating point errors.
- Track totals at the order level: `subtotal`, `discountTotal`, `taxTotal`, `grandTotal`, `paidTotal`, `changeDue`, `dueAmount`.
- Support multiple payments per order with `Payment` entries and `PaymentMethod`/`PaymentStatus` enums.
- Relation to `User` via `Order.createdById` records who created the order.
- Relation to `User` (employees) via `Order.employeeId` records who created the order. Customers are not accounts in this app.

See `prisma/schema.prisma` for the complete model definitions.
