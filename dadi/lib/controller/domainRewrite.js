var url = require('url');
var _ = require('underscore');

var domainRewrite = function (route, options) {
  var parsedRoute;

  options = _.extend({
    protocol: undefined,
    hostname: undefined
  }, options);

  parsedRoute = url.parse(route);
  parsedRoute.host = undefined;

  if (options.protocol) {
    parsedRoute.protocol = options.protocol;
  }
  if (options.hostname) {
    parsedRoute.hostname = options.hostname;
  }
  if (options.port) {
    parsedRoute.port = options.port;
  }

  return url.format(parsedRoute);
};

module.exports = domainRewrite;
