drop database if exists customer;
CREATE DATABASE customer;
USE Customer;
DROP table if exists users;

CREATE TABLE users (
	id int auto_increment primary key,
    Firstname varchar(100),
    Lastname varchar(100),
    email varchar(100) unique,
    password varchar(255)
);