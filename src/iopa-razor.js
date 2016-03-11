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
 
const razor = require('./lib/razor.js');
const path = require('path');

exports.renderView = function(context, fileName, basePath)
{   
    return new Promise(function(resolve,reject){
         renderViewCallback(context, fileName, basePath, function(err,data){
             if(err !== null) return reject(err);
             resolve(data);
         });
    });
}

exports.render = function(id, body, model, basePath, callback)
{
   if(!callback && typeof basePath === 'function')
      return exports.render(id, body, model, process.cwd(), basePath);
    
     razor.render(id, body, model, undefined, basePath, function(result) {
               callback(null, result);
             }); 
}

var renderViewCallback = function(context, fileName, basePath, callback)
{
   if(!callback && typeof basePath === 'function')
      return renderViewCallback(context, fileName, path.join(process.cwd(), '/views/'), basePath);
    
    try{ razor.view(fileName, basePath, function(template) {
               if(template) {
               template(context.model, function(html){
                        context.response.writeHead(200, {'Content-Type': 'text/html'});
                        context.response.end(html);
                        callback(null);
                        });
               }
               else {
               
               context.response.writeHead(404, {'Content-Type': 'text/html'});
               context.response.end('<h1>Not Found</h1>');
               callback(500);
               }
                    })}
    catch (ex) { 
        callback("500 Razor Parse Error in " + path + " at line " + ex.line + ":<br>" + ex.message );
    }
}