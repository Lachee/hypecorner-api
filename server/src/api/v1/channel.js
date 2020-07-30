
const Joi = require('joi');
const express = require('express');

module.exports = function(options) {    
    this.options = options;
    this.router = express.Router();

    const db = this.options.db;
    const app = this.options.app;
    const auth = this.options.authorize;

    //Get the blacklist
    this.router.get('/', (req, res, next) => {

    });

    //Just reutrn the router
    return this;
}