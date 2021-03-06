var sinon = require('sinon');
var should = require('should');
var request = require('supertest');
// loaded customised fakeweb module
//var fakeweb = require(__dirname + '/../fakeweb');
var nock = require('nock')
var _ = require('underscore');

var Controller = require(__dirname + '/../../dadi/lib/controller');
var Page = require(__dirname + '/../../dadi/lib/page');
var api = require(__dirname + '/../../dadi/lib/api');
var Server = require(__dirname + '/../../dadi/lib');
var help = require(__dirname + '/../help');
var libHelp = require(__dirname + '/../../dadi/lib/help');
var config = require(__dirname + '/../../config.js');

var clientHost = 'http://' + config.get('server.host') + ':' + config.get('server.port');
var apiHost = 'http://' + config.get('api.host') + ':' + config.get('api.port');

var auth = require(__dirname + '/../../dadi/lib/auth');

var tokenResult = JSON.stringify({
  "accessToken": "da6f610b-6f91-4bce-945d-9829cac5de71",
  "tokenType": "Bearer",
  "expiresIn": 2592000
});

function startServer(done) {

  var options = {
    pagePath: __dirname + '/../app/pages',
    eventPath: __dirname + '/../app/events'
  };

  Server.app = api();
  Server.components = {};

  // create a page
  var name = 'test';
  var schema = help.getPageSchema();
  var page = Page(name, schema);

  page.template = 'test.dust';
  page.route.paths[0] = '/test';
  page.settings.cache = false;
  page.datasources = [];
  page.events = [];
  delete page.route.constraint;

  Server.start(function() {

    setTimeout(function() {

      // create a handler for requests to this page
      var controller = Controller(page, options);

      Server.addComponent({
          key: page.key,
          route: page.route,
          component: controller
      }, false);

      done();
    }, 200);
  });
}

describe.skip('Auth', function (done) {

  before(function(done) {
    done();
  });

  beforeEach(function(done) {
    // intercept the api test at server startup
    sinon.stub(libHelp, "isApiAvailable").yields(null, true);
    done();
  });

  afterEach(function(done) {
    nock.cleanAll()
    libHelp.isApiAvailable.restore();
    help.stopServer(done);
  });

  after(function(done) {
    nock.restore()
    done()
  })

  it('should attach to the provided server instance', function (done) {

    config.set('api.enabled', true);

    startServer(function() {
      Server.app = api();
      var server = Server;

      auth(server);
      server.app.all.length.should.eql(1);

      done();
    })
  });

  it('should return error if no token was obtained', function (done) {

    var oldClientId = config.get('auth.clientId');

    config.set('auth.clientId', 'wrongClient');
    //config.set('api.enabled', true);

    var authscope1 = nock(apiHost)
      .post('/token')
      .times(2)
      .reply(401);

    // create page 1
    var page1 = Page('page1', help.getPageSchema());
    page1.datasources = [];
    page1.events = [];
    page1.template = 'test.dust';
    page1.route.paths[0] = '/test';
    delete page1.route.constraint;

    var pages = [];
    pages.push(page1)

    help.startServer(pages, function() {
      var client = request(clientHost);
      client
        .get('/test')
        .set('Connection', 'keep-alive')
        .expect('content-type', 'text/html')
        .expect(500)
        .end(function (err, res) {
          config.set('auth.clientId', oldClientId);

          var message = 'Credentials not found or invalid: The authorization process failed for the clientId/secret pair provided'
          res.text.toString().indexOf(message).should.be.above(-1);
          done();
        });
    });

  });

  it('should return error if api can\'t be reached', function (done) {

    var oldApiHost = config.get('api.host');
    config.set('api.host', 'invalid.url');

    // create page 1
    var page1 = Page('page1', help.getPageSchema());
    page1.datasources = [];
    page1.events = [];
    page1.template = 'test.dust';
    page1.route.paths[0] = '/test';
    delete page1.route.constraint;

    var pages = [];
    pages.push(page1)

    help.startServer(pages, function() {
      var client = request(clientHost);

      client
        .get('/')
        .set('Connection', 'keep-alive')
        .expect('content-type', 'text/html')
        //.expect(404)
        .end(function (err, res) {
          var message = "URL not found: The request for URL \'http://invalid.url:" + config.get('api.port') + config.get('auth.tokenUrl') + "\' returned a 404"
          res.text.toString().indexOf(message).should.be.above(-1);

          config.set('api.host', oldApiHost);

          done();
        });
    });

  });

  it('should not error if valid credentials are supplied and a token is returned', function (done) {

    config.set('api.enabled', true);

    var scope = nock('http://127.0.0.1:3000')
      .post('/token')
      .reply(200, {
        accessToken: 'xx'
      });

      // create page 1
      var page1 = Page('page1', help.getPageSchema());
      page1.datasources = [];
      page1.events = [];
      page1.template = 'test.dust';
      page1.route.paths[0] = '/test';
      delete page1.route.constraint;

      var pages = [];
      pages.push(page1)

      help.startServer(pages, function() {

        var client = request(clientHost);
        client
        .get('/test')
        .expect('content-type', 'text/html')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);

          res.statusCode.should.eql(200);

          done();
      });
    });
  });
});
