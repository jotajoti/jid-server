--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

create table jid (
  id varchar(36) not null,
  userid varchar(36) not null references user(id),
  location varchar(36) not null references locatino(id),
  jid char(6) not null,
  country char(2) not null references country(id),
  created datetime not null default (datetime('now','localtime')),
  primary key (userid, jid)
);


--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

drop table jid;
