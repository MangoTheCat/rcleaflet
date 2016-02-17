.cache <- new.env(FALSE, emptyenv())

lmap <- function(x=NULL,y=NULL,zoom=NULL,where=NULL,xlim=NULL,ylim=NULL,
                 width=800, height=600,eventfunc=NULL,lat=y,lon=x) {
    if (missing(where)) {
        where <- paste0("rc_map_", as.integer(runif(1)*1e6))
        rcloud.html.out(paste0("<div id='", where,"' style='width:",
                               width, "px;height:", height, "px'></div>"))
        where <- paste0("#", where)
    }
    if (is.null(.cache$ocaps)) {
        x <- paste(readLines(system.file("javascript", "rcl.js",
                                         package="rcleaflet"),
                             warn=FALSE), collapse='\n')
        .cache$ocaps <- rcloud.install.js.module("rcleaflet", x, TRUE)
    }

    map <- structure(list(div=.cache$ocaps$map(where,lat,lon,zoom,
                                               xlim,ylim,eventfunc)),
                     class="RCloudLeaflet")

    .cache$last.map <- map
    #return(map)
}

lremove <- function(map = .cache$last.map) {
  .cache$ocaps$remove(map$div)
  rm("last.map", envir = .cache)
}

lpanTo <- function(lat, lon, map = .cache$last.map) {
  .cache$ocaps$panTo(map$div, lat, lon)
}

## map R colors to RGB space, also re-cycle as needed and split off RGB and A
.mapColor <- function(col, n) {
    cc <- col2rgb(col, TRUE)

    l <- list(col=substr(rgb(cc[1,], cc[2,], cc[3,], cc[4,],, 255), 1, 7),
              alpha=as.vector(cc[4,])/255)
    if (length(l$col) > 1 && length(l$col) != n) {
        l$col <- rep(l$col, length.out=n)
        l$alpha <- rep(l$alpha, length.out=n)
    }
    l
}

lpoints <- function(x,y,col="black", bg="transparent", cex=1, lwd=1,
                    popup=NULL,eventfunc=NULL,lat=y,lon=x,
                    map=.cache$last.map) {
    if (is.null(map$div)) stop("invalid map object - not a Leaflet map")
    ls <- c(length(lat), length(lon))
    if (diff(ls)) { ## recycle
        lat <- rep(lat, length.out=max(ls))
        lon <- rep(lon, length.out=max(ls))
    }
    ## this is somewhat arbitrary - mapping between leaflet radius and cex ...
    cex <- cex * 72
    col <- .mapColor(col, ls[1])
    bg <- .mapColor(bg, ls[1])
    if (length(cex) > 1 && length(cex) != max(ls)){
        cex <- rep(cex, length.out=max(ls))
    }

    if (length(lwd) > 1 && length(lwd) != max(ls)){
        lwd <- rep(lwd, length.out=max(ls))
    }
    
    .cache$ocaps$points(map$div, lat, lon, col$col, bg$col, col$alpha,
                        bg$alpha, cex, lwd, popup, eventfunc)
    invisible(map)
}

# An R lty has to become an SVG stroke-dasharray
# This is going to be imperfect (to say the least)
devLtyToSVG <- function(lty, lwd) {
    # Convert lty to numeric vec
    numlty <- switch(lty,
                     solid = 0,
                     # These numbers taken from ?par
                     dashed = c(4, 4),
                     dotted = c(1, 3),
                     dotdash = c(1, 3, 4, 3),
                     longdash = c(7, 3),
                     twodash = c(2, 2, 6, 2),
                     # Otherwise we're a hex string
                     as.numeric(as.hexmode(strsplit(lty, "")[[1]])))
    # Scale by lwd
    scaledlty <- numlty * lwd

    # Convert to SVG stroke-dasharray string
    paste(ifelse(scaledlty == 0,"none",round(scaledlty, 2)),
          collapse=",")
}

lsegments <- function(x1,y1,x2,y2, col = "black",lty = 1, lwd = 1,
                      lat1=y1,lon1=x1,lat2=y2,lon2=x2,map=.cache$last.map){
    if (is.null(map$div)) stop("invalid map object - not a Leaflet map")
    ls <- c(length(lat1), length(lon1), length(lat2), length(lon2))

    if (sum(abs(diff(ls)))) { ## recycle
        lat1 <- rep(lat1, length.out=max(ls))
        lon1 <- rep(lon1, length.out=max(ls))
        lat2 <- rep(lat2, length.out=max(ls))
        lon2 <- rep(lon2, length.out=max(ls))
    }
    col <- .mapColor(col, 1)
    if (length(lty) > 1 && length(lty) != max(ls)){
        lty <- rep(lty, length.out=max(ls))
    }
    if (length(lwd) > 1 && length(lwd) != max(ls)){
        lwd <- rep(lwd, length.out=max(ls))
    }

    .cache$ocaps$segments(map$div, lat1, lon1, lat2, lon2, col$col,
                          devLtyToSVG(lty, lwd), lwd)
    invisible(map)
}



lpolyline <- function(x,y, col = "black", lty = 1, lwd = 1,
                      lat=y,lon=x,map=.cache$last.map){
    if (is.null(map$div)) stop("invalid map object - not a Leaflet map")
    ls <- c(length(lat), length(lon))

    if (sum(abs(diff(ls)))) { ## recycle
        lat <- rep(lat, length.out=max(ls))
        lon <- rep(lon, length.out=max(ls))
    }
    col <- .mapColor(col, 1)
    if (length(lty) > 1 && length(lty) != max(ls)) lty <- rep(lty,length.out=max(ls))
    if (length(lwd) > 1 && length(lwd) != max(ls)) lwd <- rep(lwd,length.out=max(ls))

    .cache$ocaps$polyline(map$div, lat, lon, col$col,
                          devLtyToSVG(lty, lwd), lwd)
    invisible(map)
}

lmarkers <- function(x, y, popup=NULL, iconurl=NULL,eventfunc=NULL,
                     lat=y, lon=x,map=.cache$last.map) {
    if (is.null(map$div)) stop("invalid map object - not a Leaflet map")
    ls <- c(length(lat), length(lon))
    if (diff(ls)) { ## recycle
        lat <- rep(lat, length.out=max(ls))
        lon <- rep(lon, length.out=max(ls))
    }
    .cache$ocaps$markers(map$div, lat, lon, popup, iconurl, eventfunc)
    invisible(map)
}

lpolygon <- function(x, y, popup=NULL, color='red', fillColor=color,
                     weight=5, lat=y, lon=x,map=.cache$last.map) {
    if (is.null(map$div)) stop("invalid map object - not a Leaflet map")
    ls <- c(length(lat), length(lon))

    if (diff(ls)) { ## recycle
        lat <- rep(lat, length.out=max(ls))
        lon <- rep(lon, length.out=max(ls))
    }

    col <- .mapColor(color, 1)
    fill <- .mapColor(fillColor, 1)
    .cache$ocaps$polygon(map$div, lat, lon, popup, col$col, col$alpha,
                         fill$col, fill$alpha, weight)
    invisible(map)
}

#Animations
lanimatedPolyline <- function(x,y,durations,maxpts=0,
                              stepsize=33,delay=0, col="blue",
                              lty=1, lwd=1, lat=y,lon=x,
                              map=.cache$last.map){
    if (is.null(map$div)) stop("invalid map object - not a Leaflet map")

    .cache$ocaps$animatedPolyline(map$div,lat,lon,durations, maxpts,
                                  stepsize,delay,col,devLtyToSVG(lty, lwd),
                                  lwd)
    invisible(map)
}

lanimatedMarker <- function(x,y,durations,stepsize=33,delay=0,
                            lat=y,lon=x,map=.cache$last.map){
    if (is.null(map$div)) stop("invalid map object - not a Leaflet map")

    .cache$ocaps$animatedMarker(map$div,lat,lon,durations,stepsize,delay)
    invisible(map)
}

getCurrentView <- function(map=.cache$last.map){
    ret <-.cache$ocaps$getCurrentView(map$div)
    return(list(xlim=unlist(ret$xlim),ylim=unlist(ret$ylim),zoom=ret$zoom))
}
