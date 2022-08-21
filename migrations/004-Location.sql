--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table location (
  id char(36) primary key,
  year int not null,
  jid char(6) not null,
  country char(2) not null references country(id),
  name varchar(128),
  owner char(36) not null references admin(id),
  created text not null default (datetime('now','localtime')),
  unique(year, jid)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

drop table location;
