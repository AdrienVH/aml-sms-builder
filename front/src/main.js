function buildSms(){
	const attributes = ['lt', 'lg', 'rd', 'top', 'lc', 'pm', 'si', 'ei', 'mcc', 'mnc']
	let sms = {}
	// Header
	sms['A"ML'] = 1
	// Attributes
	for(i in attributes){
		var attribute = attributes[i];
		if(attribute == 'top'){
			setTimeOfPositionning()
			sms[attribute] = $('#'+attribute).val().replace(/\D/g,'')
		}else{
			sms[attribute] = $('#'+attribute).val()
		}
	}
	// Message Length
	let array = []
	for(attr in sms){
		array.push(attr + '=' + sms[attr])
	}
	if( array.join(';').length >= 93 ){
		sms['ml'] = array.join(';').length + 7
	}else{
		sms['ml'] = array.join(';').length + 6
	}
	array = []
	for(attr in sms){
		array.push(attr + '=' + sms[attr])
	}
	// Vérification de la length
	if(sms['ml'] != array.join(';').length){
		alert("Il y a une différence entre la valeur de l'attribut ml ("+sms['ml']+") et la longueur du message ("+array.join(';').length+").")
	}
	return array.join(';')
}

$(".build").click(function() {
	var sms = buildSms()
	$('.sms').html(sms)
	var num = ''
	var ua = navigator.userAgent.toLowerCase();
	if (ua.indexOf("iphone") > -1 || ua.indexOf("ipad") > -1) {
		location.href = "sms:"+num+"&body=" + sms;
	}else{
		location.href = "sms:"+num+"?body=" + sms;
	}
});

function setTimeOfPositionning() {
	const d = new Date();
	const time = d.getUTCFullYear() + '-' +
		pad(d.getUTCMonth() + 1) + '-' +
		pad(d.getUTCDate()) + ' ' +
		pad(d.getUTCHours()) + ':' +
		pad(d.getUTCMinutes()) + ':' +
		pad(d.getUTCSeconds())
	$('#top').val(time)
}
setTimeOfPositionning()

function pad(number) {
	if ( number < 10 ) {
		return '0' + number
	}
	return number
}

if ("geolocation" in navigator) {
	navigator.geolocation.getCurrentPosition(function(position) {
		$('#lt').val('+'+position.coords.latitude.toFixed(6))
		$('#lg').val('+'+position.coords.longitude.toFixed(6))
		$('#rd').val(Math.round(position.coords.accuracy))
		addCircleToMap()
	}, () => {}, { enableHighAccuracy: true })
}

var basemap = new ol.layer.Tile({
	source: new ol.source.XYZ({
		url: 'https://api.mapbox.com/styles/v1/adrienvh/ckb0rvexl11d11io94axnoy29/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiYWRyaWVudmgiLCJhIjoiU2lDV0N5cyJ9.2pFJAwvwZ9eBKKPiOrNWEw'
	}),
	name: "basemap"
});

function getLocalisantsStyle(f){
	if(f.getGeometry().getType() == 'Point'){
		return new ol.style.Style({
			text: new ol.style.Text({
				font:'normal 18px "Arial"',
				text:"+",
				fill: new ol.style.Fill({color: '#4c5268'})
			})
		});
	}else{
		return new ol.style.Style({
			stroke: new ol.style.Stroke({color: '#4c5268', width: 1})
		});
	}
}

var localisantsSource = new ol.source.Vector({projection : 'EPSG:3857'});
var localisants = new ol.layer.Vector({
	source: localisantsSource,
	style: getLocalisantsStyle,
	name: "localisants"
});

var map = new ol.Map({
	layers: [basemap, localisants],
	target: document.getElementById('map'),
	view: new ol.View({
		center: ol.proj.transform([2.668288, 48.532930], 'EPSG:4326','EPSG:3857'),
		zoom: 17,
		minZoom:4,
		maxZoom:20
	}),
	controls : ol.control.defaults({
		attribution : false,
		zoom : false
	})
});

$('#lg, #lt, #rd').change(function(){
	if($('#lg').val() != '' && $('#lt').val() != '' && $('#rd').val() != ''){
		addCircleToMap();
	}
});

$('#lg, #lt, #rd').keyup(function(){
	if($('#lg').val() != '' && $('#lt').val() != '' && $('#rd').val() != ''){
		addCircleToMap();
	}
});

function addCircleToMap(){
	localisantsSource.clear();
	var centerLongitudeLatitude = ol.proj.fromLonLat([$('#lg').val(), $('#lt').val()])
	localisantsSource.addFeature(new ol.Feature(new ol.geom.Point(centerLongitudeLatitude)));
	localisantsSource.addFeature(new ol.Feature(new ol.geom.Circle(centerLongitudeLatitude, parseInt($('#rd').val()))));
	map.getView().fit(localisantsSource.getExtent());
	map.getView().setZoom(map.getView().getZoom() - 0.5);
}

$('.sms').html(buildSms())
addCircleToMap()

document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

function searchAddress(query){
	$('#search h2.recents').hide()
	$('#search ul li').remove()

	var request = $.ajax({
		url: "https://api-adresse.data.gouv.fr/search?",
		method: "GET",
		data: {q: query, limit: 10, type: 'housenumber'}
	});

	request.done(function(result) {
		if (result.features.length > 0) {
			for (const feature of result.features) {
				if (feature.properties.score > 0.5) {
					var label = feature.properties.label
					var li = $('<li data-lg="'+feature.geometry.coordinates[0]+'" data-lt="'+feature.geometry.coordinates[1]+'">' + label + '</li>').appendTo('#search ul.results')
					li.click(function(){
						$('#lt').val('+' + $(this).data('lt'))
						$('#lg').val('+' + $(this).data('lg'))
						$('#rd').val(50)
						addCircleToMap()
						$('#search').hide()
						$('#showsearchpanel').show()
						// Sauvegarde parmi les localisations récentes
						saveAddress($(this).html(), $(this).data('lt'), $(this).data('lg'))
					});
				}
			}
		} else {
			alert("Aucune adresse n'a été trouvée")
		}
	});

	request.fail(function(jqXHR, textStatus) {
		console.log("FAIL", jqXHR, textStatus)
		$('#search').hide()
		$('#showsearchpanel').show()
		alert("An error has occured")
	});
}

$( "#showsearchpanel" ).click(function() {
	$('#search input').val('')
	$('#search ul li').remove()
	$('#search').show()
	$('#showsearchpanel').hide()
	// Affichage des localisations récentes
	let addresses = localStorage.getItem('addresses')
	if (addresses) {
		$('#search h2.recents').show()
		addresses = JSON.parse(addresses)
		for (const address of addresses) {
			var li = $('<li data-lg="'+address.lg+'" data-lt="'+address.lt+'">' + address.label + '</li>').appendTo('#search ul.recents')
			li.click(function(){
				$('#lt').val('+' + $(this).data('lt'))
				$('#lg').val('+' + $(this).data('lg'))
				$('#rd').val(50)
				addCircleToMap()
				$('#search').hide()
				$('#showsearchpanel').show()
			});
		}
	} else {
		$('#search h2.recents').hide()
	}
});

$( ".search" ).click(function() {
	searchAddress($('#query').val())
});

$( ".cancel" ).click(function() {
	$('#search').hide()
	$('#showsearchpanel').show()
});

$( ".sms" ).click(function() {
	var elm = document.getElementsByClassName("sms")[0];
	var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(elm);
    selection.removeAllRanges();
    selection.addRange(range);
	document.execCommand("Copy");
	selection.removeAllRanges();
    alert("Le contenu de ce SMS a été copié dans le presse-papiers. Vous pouvez maintenant le coller dans votre application SMS, afin de l'envoyer manuellement.");
});

$(function () {
	setInterval(updateSms, 1000)
});

function updateSms() {
	setTimeOfPositionning()
	var sms = buildSms()
	$('.sms').html(sms)
}

function saveAddress(label, lt, lg) {
	let addresses = localStorage.getItem('addresses')
	if (addresses) {
		addresses = JSON.parse(addresses)
	} else {
		addresses = []
	}
	addresses.unshift({label, lt, lg})
	addresses = addresses.slice(0, 15)
	localStorage.setItem('addresses', JSON.stringify(addresses))
}