var contactHTML = 	'<div>' +
						'<img class = "contactIcon" src = "images/phone.png"> <span class = "contactTitle">Phone</span> - <span class = "contactURL">720.369.4276</span></a>' +
					'</div>' +
					'<div>' +
						'<a href="mailto:japsolum@hotmail.com?Subject=Online%20portfolio" target="_top"> <img class = "contactIcon" src = "images/email.png"> <span class = "contactTitle">Email</span> - <span class = "contactURL">Japsolum@hotmail.com</span></a>' +
					'</div>' +
					'<div>' +
						'<a href = "https://www.facebook.com/james.solum.3" target = "_blank" > <img class = "contactIcon" src = "images/facebook.png"> <span class = "contactTitle">Facebook</span> - <span class = "contactURL">https://www.facebook.com/james.solum.3</span></a>' +
					'</div>' +
					'<div>' +
						'<a href = "https://www.linkedin.com/in/james-solum-113545149/" target = "_blank" > <img class = "contactIcon" src = "images/linkedin.png"> <span class = "contactTitle">LinkedIn</span> - <span class = "contactURL">https://www.linkedin.com/in/james-solum-113545149/</span></a>' +
					'</div>' +
					'<div>' +
						'<a href = "https://github.com/japsolum" target = "_blank" > <img class = "contactIcon" src = "images/github.png"> <span class = "contactTitle">GitHub</span> - <span class = "contactURL">https://github.com/japsolum</span></a>' +
					'</div>',
	aboutHTML = "<p>Hi! I'm James,<br>" +
				"Since my highschool years, there have only been two subjects that I was truly interested in. " +
				"There may have been things I didn't mind as much, but art and problem solving were my favorites. " +
				"Those vague subjects can mean a lot of different things, to a lot of different people. But as far as I'm " +
				"concerned, nothing blends the two, like programming and/or web design.</p>" +
				"<p>So, after spending way too much time doing a good job in a career I had no interest in. While my " +
				"beautiful wife and I were expecting our first child. I decided it was time to get back to my roots. " +
				"It was time to get back to doing something I could be good at <u>and</u> enjoy doing. After a few hundred " +
				"hours getting a couple nanodegrees to catch up on everything I had missed, I am excited to be getting started launching a " +
				"career in a world I have been away from for too long." +
				'</p>', 
	projectsHTML = '<div id="myCarousel" class="carousel slide" data-ride="carousel">' +
						'<ol class="carousel-indicators">' +
				    		'<li data-target="#myCarousel" data-slide-to="0" class="active"></li>' +
				    		'<li data-target="#myCarousel" data-slide-to="1"></li>' +
				    		'<li data-target="#myCarousel" data-slide-to="2"></li>' +
				    		'<li data-target="#myCarousel" data-slide-to="3"></li>' +
				  		'</ol>' +
					  	'<div class="carousel-inner">' +
					    	'<div class="item active">' +
					      		'<a href = "C:/Users/JapSo/github/Memory-Game/index.html" target = "_blank"><img src="images/memoryGame.jpg" alt="Memory Game">' +
					    		'<div class="carousel-caption">' +
	        						'<h3 class="outline">Memory Game</h3>' +
	        						'<p class="outline">https://github.com/japsolum/Memory-Game</p>' +
	      						'</div></a>' +
					    	'</div>' +
					    	'<div class="item">' +
					      		'<a href = "C:/Users/JapSo/github/Knockout-Cat-Clicker/index.html" target = "_blank"><img src="images/catClicker.jpg" alt="Cat Clicker">' +
					    		'<div class="carousel-caption">' +
	        						'<h3 class="outline">Cat Clicker</h3>' +
	        						'<p class="outline">https://github.com/japsolum/Knockout-Cat-Clicker</p>' +
	      						'</div></a>' +
					    	'</div>' +
					    	'<div class="item">' +
					      		'<a href = "C:/Users/JapSo/github/Project-Neighborhood-Map/index.html" target = "_blank"><img src="images/neighborhoodMap.jpg" alt="Neighborhood Map">' +
					    		'<div class="carousel-caption">' +
	        						'<h3 class="outline">Neighborhood Map</h3>' +
	        						'<p class="outline">https://github.com/japsolum/Project-Neighborhood-Map</p>' +
	      						'</div></a>' +
					    	'</div>' +
					    	'<div class="item">' +
					      		'<a href = "C:/Users/JapSo/github/Arcade-Game/index.html" target = "_blank"><img src="images/arcadgeGame.jpg" alt="Arcade Game">' +
					    		'<div class="carousel-caption">' +
	        						'<h3 class="outline">Classic Arcade Game</h3>' +
	        						'<p class="outline">https://github.com/japsolum/Arcade-Game</p>' +
	      						'</div></a>' +
					    	'</div>' +
					  	'</div>' +
					  	'<a class="left carousel-control" href="#myCarousel" data-slide="prev">' +
					    	'<span class="glyphicon glyphicon-chevron-left"></span>' +
					    	'<span class="sr-only">Previous</span>' +
					  	'</a>' +
					  	'<a class="right carousel-control" href="#myCarousel" data-slide="next">' +
					    	'<span class="glyphicon glyphicon-chevron-right"></span>' +
					    	'<span class="sr-only">Next</span>' +
					  	'</a>' +
					'</div>';

$(document).ready(function(){
    $('.myCarousel').carousel({
      interval: 2500
    })
});

$('#about').click(function() {
	$('.contentWindow').html(aboutHTML);
});

$('#contact').click(function() {
	$('.contentWindow').html(contactHTML);
});

$('#projects').click(function() {
	$('.contentWindow').html(projectsHTML);
});

$('.exit, .enter').click(function() {
	$('.splashPage').css('visibility', 'hidden');
});

$('.menuBtn').click(function() {
	$('.navMenu').toggleClass('hidden-xs');
});

