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
const fs = require('fs');
const utils = require('./util.js');

module.exports = IopaRazor;
module.exports.lib = razor;

function IopaRazor(config) {
    utils.assign(this, {
        razor     : razor,
        extname        : '.jshtml',
        views          : 'views',
        defaultLayout  : undefined,
        helpers        : undefined,
        compilerOptions: undefined,
    }, config);
    
    utils.assign(this, {
        layouts        : this.views + '/layouts/',
        partials       : this.views + '/partials/',
    }, config);

    this.engine = this.renderView.bind(this);

    if (this.extname.charAt(0) !== '.') {
        this.extname = '.' + this.extname;
    }

    this.compiled    = Object.create(null);
    this.precompiled = Object.create(null);

    this._fsCache = Object.create(null);
}


IopaRazor.prototype.renderView = function (view, options, callback) {
    options || (options = {});
    
    var viewname, viewPath;
    var viewRoot = ( options.settings && options.settings.views) || this.views;
    var basePath = path.resolve(viewRoot);
    if (path.resolve( view ) == path.normalize( view ))
       {
           // absolute path
            viewPath = view;
            view = path.relative(basePath, viewPath)
       } else
       {
           // relative path
           viewPath = path.join(basePath, view );
       }
       
    viewname = this._getTemplateName(view);

    options = {
        view  : viewname,
        layout: 'layout' in options ? options.layout : this.defaultLayout,
        data    : options.data
     /*   helpers : helpers,
        partials: partials, */
    };
    
    try{ razor.view(view, basePath + path.sep, function(template) {
               if(template) {
               template(options, function(html){
                            callback(null, html);
                        });
               }
               else {     
                     callbback(404);
               }
                    })}
    catch (ex) { 
        callback(ex);
    }
};

IopaRazor.prototype.render = function(id, body, model, basePath, callback)
{
   if(!callback && typeof basePath === 'function')
      return exports.render(id, body, model, process.cwd(), basePath);
    
     razor.render(id, body, model, undefined, basePath, function(result) {
               callback(null, result);
             }); 
}

IopaRazor.prototype._getTemplateName = function (filePath, namespace) {
    var extRegex = new RegExp(this.extname + '$');
    var name     = filePath.replace(extRegex, '');

    if (namespace) {
        name = namespace + '/' + name;
    }

    return name;
};