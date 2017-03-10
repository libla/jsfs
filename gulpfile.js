var path = require('path');
var exec = require('child_process').exec;
var minimist = require('minimist');
var webpack = require('webpack');
var gulp = require('gulp'),
	gulpload = require('gulp-load-plugins')(),
	package = require('./package.json'),
	tsconfig = require('./tsconfig.json');

var parameters = minimist(process.argv.slice(2), {
	default: {}
});

function replaces()
{
	var searchs = [];
	var results = {};
	var predefine = {
		"NAME": package.name,
		"DESC": package.description,
		"VERSION": package.version,
		"AUTHOR": package.author
	}
	for (var name in predefine)
	{
		if (predefine.hasOwnProperty(name))
		{
			if (!results.hasOwnProperty(name))
				searchs.push('\\[\\[' + name + '\\]\\]');
			results[name] = predefine[name];
		}
	}
	for (var name in package.config)
	{
		if (package.config.hasOwnProperty(name))
		{
			if (!results.hasOwnProperty(name))
				searchs.push('\\[\\[' + name + '\\]\\]');
			results[name] = package.config[name];
		}
	}
	for (var name in parameters)
	{
		if (name != "_" && name != "release" && parameters.hasOwnProperty(name))
		{
			if (!results.hasOwnProperty(name))
				searchs.push('\\[\\[' + name + '\\]\\]');
			results[name] = parameters[name];
		}
	}
	return gulpload.replace(new RegExp(searchs.join('|'), "g"), function(name)
	{
		name = name.replace(/(^\[\[)|(\]\]$)/g, "");
		return results[name];
	});
}

gulp.task('clean', function()
{
	return gulp.src([path.dirname(package.main), "release"], {read: false})
		.pipe(gulpload.clean({force: true}));
});

gulp.task('build', ['clean'], function()
{
	var first = true;
	var ts = gulpload.typescript.createProject("tsconfig.json");
	return ts.src()
		.pipe(replaces())
		.pipe(gulpload.sourcemaps.init())
		.pipe(ts())
		.pipe(gulpload.sourcemaps.write("."))
		.pipe(gulp.dest(path.dirname(package.main)));
});

gulp.task('merge', ['build'], function(cb)
{
	webpack({
		context: __dirname,
		entry: path.resolve(package.main),
		output: {
			filename: "compile.js",
			path: path.resolve("release")
		},
		node: {__filename: false, __dirname: false},
		target: "node"
	}, cb);
});

gulp.task('release', ['merge'], function()
{
	var compile = path.resolve("release", "compile.js");
	return gulp.src("release/compile.js")
		.pipe(gulpload.uglify({output: {max_line_len: 1024 * 1024 * 16}}))
		.pipe(gulp.dest("release"));
});

gulp.task('default', [parameters.release ? 'release' : 'build']);

gulp.task('run', [parameters.release ? 'release' : 'build'], function()
{
	var child = exec('node --use-strict --harmony "' + (parameters.release ? 'release/compile.js' : package.main) + '"');
	child.stdout.on('data', function(data)
	{
		process.stdout.write(data);
	});
	child.stderr.on('data', function(data)
	{
		process.stderr.write(data);
	});
	process.on('SIGINT', function()
	{
	});
});