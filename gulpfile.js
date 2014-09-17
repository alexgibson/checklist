var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var manifest = require('gulp-appcache');

gulp.task('scripts', function() {
    gulp.src([
        'src/js/jquery-min.js',
        'src/js/underscore-min.js',
        'src/js/backbone-min.js',
        'src/js/backbone.localstorage-min.js',
        'src/js/main.js'
        ])
        .pipe(concat('app.js'))
        .pipe(uglify({'preserveComments': 'all'}))
        .pipe(gulp.dest('dist/js/'));
});

gulp.task('styles', function() {
    gulp.src([
        'src/css/normalize.css',
        'src/css/styles.css'
        ])
        .pipe(concat('styles.css'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('dist/css/'));
});

gulp.task('manifest', function() {
    gulp.src(['dist/**/*'])
        .pipe(manifest({
            relativePath: '/checklist/dist',
            timestamp: true,
            filename: 'web.appcache',
            exclude: ['src/**/*.js']
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch('src/js/*.js', ['scripts']);
    gulp.watch('src/css/*.css', ['styles']);
    gulp.watch('index.html', ['manifest']);
});

gulp.task('default', ['scripts', 'styles', 'manifest', 'watch']);
