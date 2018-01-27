// Line intersection test. Not very fast or elegant, but fine for testing algorithms.
function linesIntersect(line0, line1) {
    const length = ([[sx, sy], [ex, ey]]) => Math.hypot(sx - ex, sy - ey);

    if(length(line0) < length(line1)) {
        [line0, line1] = [line1, line0];
    }

    const translate = point => [point[0] - line0[0][0], point[1] - line0[0][1]];

    const line0Translated = line0.map(translate);
    const line1Translated = line1.map(translate);

    const theta = Math.atan2(line0Translated[1][0], line0Translated[1][1]);

    const rotate = point => [
        point[0] * Math.sin(theta) + point[1] * Math.cos(theta),
        point[0] * Math.cos(theta) + point[1] * -Math.sin(theta)
    ];

    const line0Rotated = line0Translated.map(rotate);
    const line1Rotated = line1Translated.map(rotate);

    if(Math.abs(line1Rotated[0][1] - line1Rotated[1][1]) < 0.00001) {
        // Lines are parallel
        return false;
    }

    if(Math.max(line1Rotated[0][1], line1Rotated[1][1]) < 0) {
        // Second line is below the first
        return false;
    }

    if(Math.min(line1Rotated[0][1], line1Rotated[1][1]) > 0) {
        // Second line is above the first
        return false;
    }

    const deltaX = line1Rotated[1][0] - line1Rotated[0][0];
    const deltaY = line1Rotated[1][1] - line1Rotated[0][1];
    const interceptX = line1Rotated[0][0] - line1Rotated[0][1] * (deltaX / deltaY);

    if(interceptX < 0 || interceptX > line0Rotated[1][0]) {
        // Lines do not intercept
        return false;
    }

    return true;
}


function lineInterceptsPolygon(startVertex, endVertex, polygon) {
    const [inEdge, outEdge] = polygon.edgesIncidentToVertex(startVertex);

    const translate = ([x, y]) => [x - startVertex[0], y - startVertex[1]];

    const inVertexAngle  = Math.atan2(...translate(inEdge[0]));
    const outVertexAngle = Math.atan2(...translate(outEdge[1]));
    const lineAngle      = Math.atan2(...translate(endVertex));

    const absMod2PI = x => (x + 2 * Math.PI) % (2 * Math.PI);

    const edgesAngle = absMod2PI(outVertexAngle - inVertexAngle);
    const edgeLineAngle = absMod2PI(outVertexAngle - lineAngle);
    const eps = 0.00001;

    return edgesAngle > edgeLineAngle + eps;
}


// Checks whether startVertex and endVertex can be connected by a straight line
// that does not intercept any polygons in
function verticesAreNeighbors(startVertex, endVertex, polygons) {
    // Check that the line between the start and end vertices does not intersect
    // the edges of obstacle, except for the edges that are directly connected
    // to the start and end vertices. These edges will always technically
    // intersect the line so they are avoided.

    let startPolygon = null;
    for(const polygon of polygons) {
        for(const edge of polygon.edges()) {
            if(edge.indexOf(startVertex) != -1) {
                // Record which polygon contains the start vertex for further
                // further intercept testing
                startPolygon = polygon;
            }
            else if(edge.indexOf(endVertex) != -1) {
            }
            else {
                if(linesIntersect(edge, [startVertex, endVertex])) {
                    return false;
                }
            }
        }
    }

    // Check that the line between the start and end vertices does not intersect
    // a polygon in the event that both vertices are part of the same polygon.
    if(startPolygon != null) {
        if(lineInterceptsPolygon(startVertex, endVertex, startPolygon)) {
            return false;
        }
    }

    return true;
}


function getNeighbors(vertex, polygons, otherVertices = []) {
    const accessable = [];

    for(const otherPolygon of polygons) {
        for(const otherVertex of otherPolygon.vertices) {
            if(verticesAreNeighbors(vertex, otherVertex, polygons)) {
                accessable.push(otherVertex);
            }
        }
    }

    for(const otherVertex of otherVertices) {
        if(verticesAreNeighbors(vertex, otherVertex, polygons)) {
            accessable.push(otherVertex);
        }
    }

    return accessable;
}


function search(start, end, obstacles) {
    const border = new HeapQueue((a, b) => a.estimate < b.estimate);
    const visited = new Set();
    const paths = new Map();

    border.add({vertex: start, prev: null, cost: 0, estimate: 0});

    while(!border.empty()) {
        const {vertex: vertex, cost: cost, prev: prev} = border.pop();

        if(visited.has(vertex)) {
            continue;
        }
        paths.set(vertex, prev);
        visited.add(vertex);

        if(vertex == end) {
            let backtraceVertex = vertex;
            const path = [];

            while(paths.get(backtraceVertex) != null) {
                const prevVertex = paths.get(backtraceVertex);
                path.push([prevVertex, backtraceVertex]);
                backtraceVertex = prevVertex;
            }
            return path;
        }

        for(const neighbor of getNeighbors(vertex, obstacles, [end])) {
            if(!visited.has(neighbor)) {
                const dist = ([x, y]) => Math.hypot(neighbor[0] - x, neighbor[1] - y);
                
                border.add({
                    vertex: neighbor,
                    prev: vertex,
                    cost:     cost + dist(vertex),
                    estimate: cost + dist(vertex) + dist(end)
                });
            }
        }
    }

    return null;
}


const renderer = new Renderer();

const start = [0,                 Math.random() * window.innerHeight];
const end   = [window.innerWidth, Math.random() * window.innerHeight];

const reservedPoints = [start.concat(10), end.concat(10)];
const obstacles = generateObstacles(window.innerWidth, window.innerHeight, reservedPoints);

for(const polygon of obstacles) {
    renderer.drawPolygon(polygon, "#888", "#555");
}

const path = search(start, end, obstacles);

if(path == null) {
    alert("Didn't find a path");
}
else {
    for([prev, next] of path) {
        renderer.drawLine(...prev, ...next, "green", 2);
    }
}
