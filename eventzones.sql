ALTER TABLE event_zones
ADD COLUMN reserved INT NOT NULL DEFAULT 0 AFTER sold;


ALTER TABLE orders
ADD COLUMN reservationExpiresAt DATETIME NULL AFTER paidAt,
ADD COLUMN reservationReleasedAt DATETIME NULL AFTER reservationExpiresAt;

