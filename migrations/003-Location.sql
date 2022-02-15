--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table location (
  id char(36) primary key,
  year int not null,
  jid char(6) not null,
  name varchar(128),
  owner char(36) not null,
  created datetime not null default (datetime('now','localtime')),
  unique(year, jid)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

drop table location;
