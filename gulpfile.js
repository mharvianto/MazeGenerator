var gulp = require('gulp');
var minify = require('gulp-minify');
var uglify = require('gulp-uglify');

gulp.task('default', function() {
	return gulp.src('maze.js')
		//.pipe(uglify())
		.pipe(minify())
		.pipe(gulp.dest('build'));
});

