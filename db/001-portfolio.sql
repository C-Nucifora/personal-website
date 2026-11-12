CREATE TABLE IF NOT EXISTS portfolio_state (
  id smallint PRIMARY KEY CHECK (id = 1),
  revision integer NOT NULL CHECK (revision > 0),
  draft jsonb NOT NULL,
  published jsonb,
  published_revision integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portfolio_revisions (
  revision integer PRIMARY KEY,
  config jsonb NOT NULL,
  action text NOT NULL CHECK (action IN ('initialize', 'save', 'publish', 'restore')),
  message text NOT NULL DEFAULT '',
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
