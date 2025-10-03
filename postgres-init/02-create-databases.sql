-- Create databases for both applications
-- Note: The main database (sway_timers) is already created by POSTGRES_DB
-- We just need to create the toast database

-- Create database for toast application
CREATE DATABASE sway_toast;

-- Grant permissions to the sway user for the toast database
GRANT ALL PRIVILEGES ON DATABASE sway_toast TO sway;