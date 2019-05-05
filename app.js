var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', express.static('static'));
app.use('/resources', express.static('resources'));
app.use('/test-resources', express.static('test-resources'));

module.exports = app;
