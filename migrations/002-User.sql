--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table user (
  id varchar(36) not null primary key,
  username varchar(32) not null unique,
  password varchar(256),
  salt varchar(64) not null,
  name varchar(128),
  phone varchar(16),
  created datetime not null default (datetime('now','localtime'))
)

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE user;
