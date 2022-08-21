--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table user (
  id char(36) not null primary key,
  location char(36) not null references location(id),
  name varchar(128) not null,
  password varchar(256),
  salt varchar(64) not null,
  created text not null default (datetime('now','localtime')),
  unique(location, name)
)

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

drop table user;
