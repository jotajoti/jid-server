--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table admin (
  id varchar(36) not null primary key,
  email varchar(256) not null unique,
  password varchar(256),
  salt varchar(64) not null,
  name varchar(128),
  phone varchar(16),
  created datetime not null default (datetime('now','localtime'))
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

drop table admin;
