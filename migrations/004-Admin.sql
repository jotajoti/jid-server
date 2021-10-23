--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table admin (
  id varchar(36) not null primary key,
  email varchar(128) not null unique,
  password varchar(256),
  salt varchar(64) not null,
  name varchar(128) not null,
  phone varchar(16),
  created datetime not null default (datetime('now','localtime'))
)

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE admin;
