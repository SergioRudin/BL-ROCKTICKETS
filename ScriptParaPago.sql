ALTER TABLE orders
ADD COLUMN paymentProvider VARCHAR(50) NULL AFTER status,
ADD COLUMN paymentId VARCHAR(255) NULL AFTER paymentProvider,
ADD COLUMN paymentReference VARCHAR(255) NULL AFTER paymentId,
ADD COLUMN paidAt DATETIME NULL AFTER paymentReference;

CREATE INDEX idx_orders_payment_id
ON orders(paymentId);


ALTER TABLE orders
MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'PENDING';

ALTER TABLE orders
ADD COLUMN paymentProvider VARCHAR(50) NULL AFTER status,
ADD COLUMN paymentId VARCHAR(255) NULL AFTER paymentProvider,
ADD COLUMN checkoutSessionId VARCHAR(255) NULL AFTER paymentId,
ADD COLUMN paymentReference VARCHAR(255) NULL AFTER checkoutSessionId,
ADD COLUMN paidAt DATETIME NULL AFTER paymentReference;

CREATE INDEX idx_orders_payment_id
ON orders(paymentId);

CREATE INDEX idx_orders_checkout_session
ON orders(checkoutSessionId);
SHOW INDEX FROM orders;

DESCRIBE orders;

ALTER TABLE orders
ADD COLUMN checkoutSessionId VARCHAR(255) NULL AFTER paymentId;
CREATE INDEX idx_orders_checkout_session
ON orders(checkoutSessionId);



ALTER TABLE orders
ADD COLUMN paymentReference VARCHAR(255) NULL AFTER checkoutSessionId,
ADD COLUMN paidAt DATETIME NULL AFTER paymentReference;
SHOW INDEX FROM orders;

CREATE INDEX idx_orders_checkout_session
ON orders(checkoutSessionId);