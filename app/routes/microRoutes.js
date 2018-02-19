'use strict';

const MicroController = require('../controllers/microController');


module.exports = function(app) {
	app.route('/generateCustomReports').post(MicroController.generateCustomReports);
};
