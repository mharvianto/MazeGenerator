var gulp = require('gulp');
var minify = require('gulp-minify');

gulp.task('default', function() {
	return gulp.src('maze.js')
		.pipe(minify())
		.pipe(gulp.dest('build'));
});

