-- Every piece is rentable unless an admin opts it out.

alter table pieces alter column is_rentable set default true;
update pieces set is_rentable = true where not is_rentable;
