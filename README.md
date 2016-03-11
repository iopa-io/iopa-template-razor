# [![IOPA](http://iopa.io/iopa.png)](http://iopa.io)<br> iopa-template-razor 

[![Build Status](https://api.shippable.com/projects/56e23af39d043da07bb6ff01/badge?branchName=master)](https://app.shippable.com/projects/56e23af39d043da07bb6ff01) 
[![IOPA](https://img.shields.io/badge/iopa-middleware-99cc33.svg?style=flat-square)](http://iopa.io)
[![limerun](https://img.shields.io/badge/limerun-certified-3399cc.svg?style=flat-square)](https://nodei.co/npm/limerun/)

[![NPM](https://nodei.co/npm/iopa-template-razor.png?downloads=true)](https://nodei.co/npm/iopa-template-razor/)

## About
`iopa-template-razor` is IOPA middleware for rendering templates using razor view engine

## Installation

```js
$ npm install iopa-template-razor
```

## Credits

This project, including documentation, was forked under MIT license from [andyedinborough/RazorJS](https://github.com/andyedinborough/RazorJS) with various changes throughout to filename and package handling, and so that it that is easier to consume from OWIN-JS, Connect, Koa, and Express middleware.

To date, the raw parsing routines have not been adjusted materially from the RazorJS implementation.

## API

A JavaScript implementation of the Razor view engine that aims to be simple and compatible for use both in the browser and in Node--simple enough for templating:

    razor.lib.compile('hello @model.name')({ name: 'world' }) == 'hello world'

As well as an IOPA view-engine:

```js
const iopa = require('iopa'),
    templates = require('iopa-templates'),
    razor = require('iopa-template-razor'),
    http = require('http'),
    iopaConnect = require('iopa-connect')

var app = new iopa.App();

app.use(templates);

app.engine('.jshtml', razor({views: 'test/views' }));
    
app.use(function(context, next) {
    return context.render('home.jshtml', {data: { message: "Hello World" } });
});

http.createServer(app.buildHttp()).listen(3000);
```

## Live Demo (of underlying view engine technology)
 
Try RazorJS in your browser now: http://jsbin.com/imihov/latest

## Syntax


<table>
  <tbody>
      <tr>
          <th valign="top">Description</th>
          <th valign="top">Code</th>
          <th valign="top">Notes</th>
      </tr>

      <tr>
          <td valign="top">Code Block</td>
          <td valign="top">
              <pre>
@{ 
	int x = 123; 
	string y = "because.";
}
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
          <td valign="top">Expression (Html Encoded)</td>
          <td valign="top">
              <pre>
&lt;span&gt;@model.message&lt;/span&gt;
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
          <td valign="top">Expression (Unencoded)</td>

          <td valign="top">
              <pre>
&lt;span&gt;
	@html.raw(model.message)
&lt;/span&gt;
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
          <td valign="top">Combining Text and markup</td>

          <td valign="top">
              <pre>
@@{ 
	model.items.forEach(function(item) {
		&lt;span&gt;@item.Prop&lt;/span&gt; 
	}); 
}
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
          <td valign="top">Mixing code and Plain text</td>

          <td valign="top">
              <pre>
@if (foo) {
	&lt;text&gt;Plain Text&lt;/text&gt; 
}
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
          <td valign="top">Mixing code and plain text
          (alternate)</td>

          <td valign="top">
              <pre>
@if (foo) {
	@:Plain Text is @bar
}
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
          <td valign="top">Email Addresses</td>

          <td valign="top">
              <pre>
Hi test@example.com
</pre>
          </td>

          <td valign="top">Razor recognizes basic email
          format and is smart enough not to treat the @ as a code
          delimiter</td>
      </tr>

      <tr>
          <td valign="top">Explicit Expression</td>

          <td valign="top">
              <pre>
&lt;span&gt;ISBN@(isbnNumber)&lt;/span&gt;
</pre>
          </td>

          <td valign="top">In this case, we need to be
          explicit about the expression by using parentheses.</td>
      </tr>

      <tr>
          <td valign="top">Escaping the @ sign</td>

          <td valign="top">
              <pre>
&lt;span&gt;In Razor, you use the 
@@foo to display the value 
of foo&lt;/span&gt;
</pre>
          </td>

          <td valign="top">@@ renders a single @ in the
          response.</td>
      </tr>

      <tr>
          <td valign="top">Server side Comment</td>

          <td valign="top">
              <pre>
@*
	This is a server side 
	multiline comment 
*@
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
          <td valign="top">Mixing expressions and text</td>

          <td valign="top">
              <pre>
Hello @title. @name.
</pre>
          </td>
          <td> </td>
      </tr>

      <tr>
        <td valign="top">Partials </td>
        <td>
            <pre>
@html.renderPartial('another-view')
</pre>              
        </td>
      </tr>

      <tr>
        <td valign="top">Layouts </td>
        <td>
            <strong>View</strong>
            <pre>
@{ this.layout = '_layout'; } 

@section my_section(){
  @:hi!
}             
</pre>              
            <strong>Layout</strong>
            <pre>
  @this.renderBody()
  @this.renderSection('my_section')
</pre>              
        </td>
      </tr>
	</tbody>
</table>            
