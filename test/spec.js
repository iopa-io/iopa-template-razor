/*
 * Copyright (c) 2016 Internet of Protocols Alliance (IOPA)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
// global.Promise = require('bluebird');
 
const razor = require('../index.js'),
  stubServer = require('iopa-test').stubServer
  
var should = require('should');
const iopa = require('iopa');

describe('#Razor()', function () {
 
    var seq = 0;

    it('should format razor template', function (done) {

        var app = new iopa.App();
        
        app.use(function(context, next) {
            context.model = { 'message': "Hello World" };
            return razor.renderView(context, '/test/views/index.js.html');
        });
    
        var server = stubServer.createServer(app.build())
      
        var context = server.receive();
        var responseBody = context.response["iopa.Body"].toString();
        responseBody.should.containEql('<H1>Hello World</H1>');
        done();
    });
});
