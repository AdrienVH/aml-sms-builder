function buildSms(){
	const attributes = ['lt', 'lg', 'rd', 'top', 'lc', 'pm', 'si', 'ei', 'mcc', 'mnc']
	let sms = {}
	// Header
	sms['A"ML'] = 1
	// Attributes
	for(i in attributes){
		var attribute = attributes[i]
		if(attribute == 'top'){
			setTimeOfPositionning()
			sms[attribute] = $('#'+attribute).val().replace(/\D/g,'')
		}else{
			sms[attribute] = $('#'+attribute).val()
		}
	}
	// Message Length
	let array = []
	for (attr in sms) {
		array.push(attr + '=' + sms[attr])
	}
	sms['ml'] = array.join(';').length >= 93 ? array.join(';').length + 7 : array.join(';').length + 6
	// Construction finale
	array = []
	for(attr in sms){
		array.push(attr + '=' + sms[attr])
	}
	// Vérification de la length
	if (sms['ml'] != array.join(';').length) {
		alert("Il y a une différence entre la valeur de l'attribut ml ("+sms['ml']+") et la longueur du message ("+array.join(';').length+").")
	}
	return array.join(';')
}

$(".send").click(function() {
	const callee = $(this).data('endpoint')
	const sms = buildSms()
	const endpoint = localStorage.getItem(`endpoint${callee}`)
	console.info('Endpoint :', endpoint)
	console.info('Body :', sms)
	location.href = `sms:${endpoint}?body=${encodeURIComponent(sms)}`
})

function setTimeOfPositionning() {
	const d = new Date()
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
	return number < 10 ? '0' + number : number
}

if ("geolocation" in navigator) {
	navigator.geolocation.getCurrentPosition(function(position) {
		$('#lt').val(formatCoordinate(position.coords.latitude))
		$('#lg').val(formatCoordinate(position.coords.longitude))
		$('#rd').val(Math.round(position.coords.accuracy))
		addCircleToMap()
	}, () => {}, { enableHighAccuracy: true })
}

function formatCoordinate(coordinate) {
	return coordinate >= 0 ? '+' + coordinate.toFixed(6) : coordinate.toFixed(6)
}

var basemap = new ol.layer.Tile({
	source: new ol.source.XYZ({
		url: 'https://api.mapbox.com/styles/v1/adrienvh/cldf033fp001e01o9ymftsm1q/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiYWRyaWVudmgiLCJhIjoiU2lDV0N5cyJ9.2pFJAwvwZ9eBKKPiOrNWEw'
	}),
	name: "basemap"
})

function getLocalisantsStyle(f){
	if(f.getGeometry().getType() == 'Point'){
		return new ol.style.Style({
			text: new ol.style.Text({
				font:'normal 18px "Arial"',
				text:"+",
				fill: new ol.style.Fill({color: '#056d59'})
			})
		})
	}else{
		return new ol.style.Style({
			stroke: new ol.style.Stroke({color: '#056d59', width: 1})
		})
	}
}

var localisantsSource = new ol.source.Vector({projection : 'EPSG:3857'})
var localisants = new ol.layer.Vector({
	source: localisantsSource,
	style: getLocalisantsStyle,
	name: "localisants"
})

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
})

$('#lg, #lt, #rd').change(function(){
	if($('#lg').val() != '' && $('#lt').val() != '' && $('#rd').val() != ''){
		addCircleToMap()
	}
})

$('#lg, #lt, #rd').keyup(function(){
	if($('#lg').val() != '' && $('#lt').val() != '' && $('#rd').val() != ''){
		addCircleToMap()
	}
})

function addCircleToMap(){
	localisantsSource.clear()
	var centerLongitudeLatitude = ol.proj.fromLonLat([$('#lg').val(), $('#lt').val()])
	localisantsSource.addFeature(new ol.Feature(new ol.geom.Point(centerLongitudeLatitude)))
	localisantsSource.addFeature(new ol.Feature(new ol.geom.Circle(centerLongitudeLatitude, parseInt($('#rd').val()))))
	map.getView().fit(localisantsSource.getExtent())
	map.getView().setZoom(map.getView().getZoom() - 0.5)
}

addCircleToMap()

document.addEventListener('gesturestart', function (e) {
    e.preventDefault()
})

function searchAddress(query){
	$('#search h2.recents').hide()
	$('#search ul li').remove()

	var request = $.ajax({
		url: "https://data.geopf.fr/geocodage/search?",
		method: "GET",
		data: {q: query, limit: 10, type: 'housenumber'}
	})

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
						// Sauvegarde parmi les localisations récentes
						saveAddress($(this).html(), $(this).data('lt'), $(this).data('lg'))
					})
				}
			}
		} else {
			alert("Aucune adresse n'a été trouvée")
		}
	})

	request.fail(function(jqXHR, textStatus) {
		console.log("FAIL", jqXHR, textStatus)
		$('#search').hide()
		alert("Une erreur est survenue")
	})
}

$('#showsearchpanel').click(function() {
	$('#search input').val('')
	$('#search ul li').remove()
	$('#search').show()
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
			})
		}
	} else {
		$('#search h2.recents').hide()
	}
})

$('.search').click(function() {
	searchAddress($('#query').val())
})

$('.cancel').click(function() {
	$('#search, #endpoints').hide()
})

$('#showendpointspanel').click(function() {
	$('#endpoint18').val(localStorage.getItem('endpoint18'))
	$('#endpoint112').val(localStorage.getItem('endpoint112'))
	$('#endpoints').show()
})

$('.save').click(function() {
	localStorage.setItem('endpoint18', $('#endpoint18').val())
	localStorage.setItem('endpoint112', $('#endpoint112').val())
	$('#endpoints').hide()
})

$(function () {
	setInterval(setTimeOfPositionning, 1000)
})

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