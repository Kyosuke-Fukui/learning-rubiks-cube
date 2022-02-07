window.addEventListener("load", init);
function init() {

    const canvas = document.querySelector('#rubiks');
    const width = 400;
    const height = 250;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const colorY = 0xffff00;
    const colorB = 0x0000ff;
    const colorR = 0xff0000;
    const colorG = 0x00ff00;
    const colorO = 0xffA500;
    const colorW = 0xffffff;
    const colorE = 0x000000;

    function createHomeFaces() {
        const faces0 = [
            colorY, // 0 - 8
            colorB, // 9 - 17
            colorR, // 18 - 26
            colorG, // 27 - 35
            colorO, // 36 - 44
            colorW, // 45 - 53
        ];
        const faces = [];
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 9; j++) {
                faces.push({ color: faces0[i], box: null, rotated: false });
            }
        }
        return faces;
    }

    function copyFaces(faces) {
        const dst = [];
        for (let i = 0; i < 54; i++) {
            const f = faces[i];
            dst.push({ color: f.color });
        }
        return dst;
    }

    const faces = createHomeFaces();
    const faces2 = copyFaces(faces);

    const nullRotationAction = { axis: "", direction: [0, 0, 0], speed: 1 };
    let rotationAction = nullRotationAction;
    let rotationActionStartTime = new Date().getTime();
    const actionQueue = [];

    const cubeWidth = 100;
    const cubePadding = 5;
    const faceDepth = 5;
    const rubiksHalfWidth = (cubeWidth * 3 - faceDepth) * 0.5;

    function createBox(color, axis) {
        const material1 = new THREE.MeshBasicMaterial({ color: color, opacity: 0.8, transparent: false });
        const material2 = new THREE.MeshBasicMaterial({ color: colorE, opacity: 0.4, transparent: true });
        const materials = [material2, material2, material2, material2, material2, material2];
        let w, h, d;
        if (axis == "x") {
            materials[0] = material1;
            materials[1] = material1;
            w = faceDepth;
            h = cubeWidth - cubePadding;
            d = cubeWidth - cubePadding;
        } else if (axis == "y") {
            materials[2] = material1;
            materials[3] = material1;
            w = cubeWidth - cubePadding;
            h = faceDepth;
            d = cubeWidth - cubePadding;
        } else if (axis == "z") {
            materials[4] = material1;
            materials[5] = material1;
            w = cubeWidth - cubePadding;
            h = cubeWidth - cubePadding;
            d = faceDepth;
        }
        const geometry = new THREE.BoxGeometry(w, h, d);
        const box = new THREE.Mesh(geometry, materials);
        return box;
    }

    let nameIdx = 0

    function replaceBox(face, faceDirection, faceSign, i, j, rot, cos, sin) {
        if (face.rotated) {
            scene.remove(face.box);
            face.rotated = false;
            face.box = null;
        }
        const oldBox = face.box;
        if (oldBox == null) {
            face.box = createBox(face.color, faceDirection);
        }
        const box = face.box;
        let x, y, z;
        if (faceDirection == "x") {
            x = faceSign * rubiksHalfWidth;
            y = (1 - i) * cubeWidth;
            z = faceSign * (1 - j) * cubeWidth;
        } else if (faceDirection == "y") {
            x = (j - 1) * cubeWidth;
            y = faceSign * rubiksHalfWidth;
            z = faceSign * (i - 1) * cubeWidth;
        } else if (faceDirection == "z") {
            x = faceSign * (j - 1) * cubeWidth;
            y = (1 - i) * cubeWidth;
            z = faceSign * rubiksHalfWidth;
        }
        let [rx, ry, rz] = [0, 0, 0];
        if (rotationAction.axis == "x") {
            let directionIdx;
            if (faceDirection == "x") {
                directionIdx = faceSign + 1;
            } else if (faceDirection == "y") {
                directionIdx = j;
            } else if (faceDirection == "z") {
                directionIdx = faceSign * (j - 1) + 1
            }
            const sign = rotationAction.direction[directionIdx];
            if (sign != 0) {
                const y2 = y * cos + z * sin * sign;
                const z2 = z * cos - y * sin * sign;
                y = y2;
                z = z2;
                rx = -sign * rot;
            }
        } else if (rotationAction.axis == "y") {
            let directionIdx;
            if (faceDirection == "x") {
                directionIdx = 2 - i;
            } else if (faceDirection == "y") {
                directionIdx = faceSign + 1;
            } else if (faceDirection == "z") {
                directionIdx = 2 - i;
            }
            const sign = rotationAction.direction[directionIdx];
            if (sign != 0) {
                const z2 = z * cos + x * sin * sign;
                const x2 = x * cos - z * sin * sign;
                z = z2;
                x = x2;
                ry = -sign * rot;
            }
        } else if (rotationAction.axis == "z") {
            let directionIdx;
            if (faceDirection == "x") {
                directionIdx = faceSign * (1 - j) + 1
            } else if (faceDirection == "y") {
                directionIdx = faceSign * (i - 1) + 1
            } else if (faceDirection == "z") {
                directionIdx = faceSign + 1;
            }
            const sign = rotationAction.direction[directionIdx];
            if (sign != 0) {
                const x2 = x * cos + y * sin * sign;
                const y2 = y * cos - x * sin * sign;
                x = x2;
                y = y2;
                rz = -sign * rot;
            }
        }
        box.position.x = x;
        box.position.y = y;
        box.position.z = z;
        box.rotation.x = rx;
        box.rotation.y = ry;
        box.rotation.z = rz;
        if (oldBox == null) {
            box.name = nameIdx
            nameIdx += 1
            scene.add(box);
        }
    }

    function replaceBoxes(rot, cos, sin) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const idx = 3 * i + j;
                replaceBox(faces[idx], "y", +1, i, j, rot, cos, sin);
            }
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const idx = 9 + 3 * i + j;
                replaceBox(faces[idx], "z", +1, i, j, rot, cos, sin);
            }
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const idx = 18 + 3 * i + j;
                replaceBox(faces[idx], "x", +1, i, j, rot, cos, sin);
            }
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const idx = 27 + 3 * i + j;
                replaceBox(faces[idx], "z", -1, i, j, rot, cos, sin);
            }
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const idx = 36 + 3 * i + j;
                replaceBox(faces[idx], "x", -1, i, j, rot, cos, sin);
            }
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const idx = 45 + 3 * i + j;
                replaceBox(faces[idx], "y", -1, i, j, rot, cos, sin);
            }
        }
    }

    // replaceBoxes(0.0, 1.0, 0.0);

    function calcRotationAngle() {
        const now = new Date().getTime();
        let a = 0.001;
        if (actionQueue.length >= 53) {
            a = 0.013;
        } else if (actionQueue.length >= 17) {
            a = 0.008;
        } else if (actionQueue.length >= 5) {
            a = 0.005;
        } else if (actionQueue.length >= 1) {
            a = 0.003;
        } else {
            a = 0.002;
        }
        let d = (now - rotationActionStartTime) * rotationAction.speed * a;
        if (d >= 1.0) {
            return [true, 0.0, 1.0, 0.0];
        } else {
            d = d * 0.5 * Math.PI;
            return [false, d, Math.cos(d), Math.sin(d)];
        }
    }

    function intervalAction(speed) {
        return { axis: "", direction: [0, 0, 0], speed: speed };
    }

    function actRotation() {
        const [flag, rot, cos, sin] = calcRotationAngle();
        if (flag) {
            rotateFaces(rotationAction, faces);
            if (actionQueue.length == 0) {
                rotationAction = intervalAction(1);
                rotationActionStartTime = 0;
            } else if (rotationAction.axis == "") {
                rotationAction = actionQueue.shift();
                rotationActionStartTime = new Date().getTime();
            } else {
                const speed = Math.min(rotationAction.speed, actionQueue[0].speed);
                rotationAction = intervalAction(speed);
                rotationActionStartTime = new Date().getTime();
            }
            replaceBoxes(rot, cos, sin);
        } else if (rotationAction.axis != "") {
            replaceBoxes(rot, cos, sin);
        }
    }

    //actRotation();

    const camera = new THREE.PerspectiveCamera(65, width / height, 1, 1000);
    const cameraX = 240;
    const cameraY = 240;
    const cameraZ = 320;

    function resetCamera() {
        camera.position.set(cameraX, cameraY, cameraZ);
        camera.lookAt(scene.position);
    }

    function resetCameraBottom() {
        camera.position.set(cameraX, -cameraY, cameraZ);
        camera.lookAt(scene.position);
    }

    function resetCameraReverse() {
        camera.position.x = -camera.position.x;
        camera.position.y = -camera.position.y;
        camera.position.z = -camera.position.z;
        camera.lookAt(scene.position);
    }

    resetCamera();

    document.getElementById("reset-camera").addEventListener("click", function (event) {
        resetCamera();
        event.preventDefault();
        return false;
    });
    document.getElementById("reset-camera-bottom").addEventListener("click", function (event) {
        resetCameraBottom();
        event.preventDefault();
        return false;
    });
    document.getElementById("reset-camera-reverse").addEventListener("click", function (event) {
        resetCameraReverse();
        event.preventDefault();
        return false;
    });

    const controls = new THREE.OrbitControls(camera, canvas);
    controls.rotateSpeed = 0.5;
    // controls.update();

    renderer.render(scene, camera);

    const btnActions = {};
    const keyEventHandlers = {};
    function activateBtns() {
        for (const id in btnActions) {
            const actions = btnActions[id];
            if (typeof (actions) == "function") {
                acts = actions();
                if (acts == null || acts.length == 0) {
                    document.getElementById(id).classList.add("btn-inactive");
                } else {
                    document.getElementById(id).classList.remove("btn-inactive");
                }
            }
        }
    }

    function pushActionToQueue(action) {
        let flag = false;
        if (actionQueue.length > 0) {
            const lastAction = actionQueue[actionQueue.length - 1];
            if (lastAction.axis == action.axis) {
                const direction = [
                    lastAction.direction[0] + action.direction[0],
                    lastAction.direction[1] + action.direction[1],
                    lastAction.direction[2] + action.direction[2],
                ];
                const max = Math.max(...direction);
                const min = Math.min(...direction);
                if (max == 0 && min == 0) {
                    actionQueue.pop();
                    flag = true;
                } else if (max <= +1 && min >= -1) {
                    lastAction.direction = direction;
                    flag = true;
                }
            }
        }
        if (flag) {
            rotateFaces(action, faces2);
            return;
        }
        if (actionQueue.length > 200) {
            console.log("ERROR");
            return;
        }
        actionQueue.push(action);
        rotateFaces(action, faces2);
    }

    function setActionBtnClickEvent(id, key, actions) {
        const handler = function (event) {
            let acts;
            if (typeof (actions) == "function") {
                acts = actions();
            } else {
                acts = actions;
            }
            if (acts != null) {
                //手順を画面に表示
                // if (id != "action-shuffle") {
                document.getElementById('act').innerHTML += `(${id.slice(7)})`
                for (const act of acts) {
                    pushActionToQueue(act);
                    displayAct(act);
                }
                document.getElementById('act').innerHTML += "<br>"
                // } else {
                //     document.getElementById('act').innerHTML = ''
                //     for (const act of acts) {
                //         pushActionToQueue(act);
                //     }
                // }
                activateBtns();
            }
            if (event) {
                event.preventDefault();
            }

            return false;
        };

        document.getElementById(id).addEventListener("click", handler);

        btnActions[id] = actions;
        if (key != "") {
            keyEventHandlers[key] = handler;
        }
    }

    // X軸: 右方向, Y軸: 上方向, Z軸: 手前方向
    setActionBtnClickEvent("action-r1", "r", [{ axis: "x", direction: [0, 0, +1], speed: 1 }]);
    setActionBtnClickEvent("action-r3", "R", [{ axis: "x", direction: [0, 0, -1], speed: 1 }]);
    setActionBtnClickEvent("action-l1", "l", [{ axis: "x", direction: [-1, 0, 0], speed: 1 }]);
    setActionBtnClickEvent("action-l3", "L", [{ axis: "x", direction: [+1, 0, 0], speed: 1 }]);
    setActionBtnClickEvent("action-u1", "u", [{ axis: "y", direction: [0, 0, +1], speed: 1 }]);
    setActionBtnClickEvent("action-u3", "U", [{ axis: "y", direction: [0, 0, -1], speed: 1 }]);
    setActionBtnClickEvent("action-f1", "f", [{ axis: "z", direction: [0, 0, +1], speed: 1 }]);
    setActionBtnClickEvent("action-f3", "F", [{ axis: "z", direction: [0, 0, -1], speed: 1 }]);

    setActionBtnClickEvent("action-d1", "d", [{ axis: "y", direction: [-1, 0, 0], speed: 1 }]);
    setActionBtnClickEvent("action-d3", "D", [{ axis: "y", direction: [+1, 0, 0], speed: 1 }]);
    setActionBtnClickEvent("action-b1", "b", [{ axis: "z", direction: [-1, 0, 0], speed: 1 }]);
    setActionBtnClickEvent("action-b3", "B", [{ axis: "z", direction: [+1, 0, 0], speed: 1 }]);
    setActionBtnClickEvent("action-m1", "m", [{ axis: "x", direction: [0, -1, 0], speed: 1 }]);
    setActionBtnClickEvent("action-m3", "M", [{ axis: "x", direction: [0, +1, 0], speed: 1 }]);

    setActionBtnClickEvent("action-x1", "x", [{ axis: "x", direction: [+1, +1, +1], speed: 1 }]);
    setActionBtnClickEvent("action-x3", "X", [{ axis: "x", direction: [-1, -1, -1], speed: 1 }]);
    setActionBtnClickEvent("action-y1", "y", [{ axis: "y", direction: [+1, +1, +1], speed: 1 }]);
    setActionBtnClickEvent("action-y3", "Y", [{ axis: "y", direction: [-1, -1, -1], speed: 1 }]);
    setActionBtnClickEvent("action-z1", "z", [{ axis: "z", direction: [+1, +1, +1], speed: 1 }]);
    setActionBtnClickEvent("action-z3", "Z", [{ axis: "z", direction: [-1, -1, -1], speed: 1 }]);

    document.body.addEventListener("keydown", function (event) {
        const handler = keyEventHandlers[event.key];
        if (handler) {
            handler();
        }
    });
    // ボタンクリック⇒setActionBtnClickEvent実行⇒引数actionsによってactsが決定
    // ⇒actsの要素actそれぞれを引数にpushActionToQueue実行⇒actionQueueにactを追加＋
    // actと現在の盤面情報（faces2）を引数にrotateFaces実行⇒faces2の色情報が書き変わる（faces2はshuffle以外で使用）
    // 毎フレームanimateが実行⇒actRotation実行⇒faces（箱情報付きの盤面情報）書き換え＋rotationActionにactionQueueの要素を追加＋
    // replaceBoxes実行⇒54個の各boxに対し、replaceBox実行⇒
    // createBox実行によって作られた新しいboxにfacesの箱情報を書き換え＋sceneにbox追加

    // function shuffleActions() {
    //     const actions = [];
    //     const speed = 3;
    //     for (let i = 0; i < 20; i++) {
    //         let axis = Math.floor(Math.random() * 3);
    //         if (axis == 0) {
    //             axis = "x";
    //         } else if (axis == 1) {
    //             axis = "y";
    //         } else {
    //             axis = "z";
    //         }
    //         const direction = [
    //             Math.floor(Math.random() * 3 - 1),
    //             Math.floor(Math.random() * 3 - 1),
    //             Math.floor(Math.random() * 3 - 1),
    //         ];
    //         actions.push({ axis, direction, speed });
    //     }
    //     return actions;
    // }

    // setActionBtnClickEvent("action-shuffle", "", function () {
    //     return shuffleActions();
    // });

    //--------------------------------------------------------------------------------


    function rotateFaces(rotationAction, faces) {
        function rotate1(i1, i2, i3, i4) {
            const tmp = faces[i1];
            faces[i1] = faces[i4];
            faces[i4] = faces[i3];
            faces[i3] = faces[i2];
            faces[i2] = tmp;
            faces[i1].rotated = true;
            faces[i2].rotated = true;
            faces[i3].rotated = true;
            faces[i4].rotated = true;
        }
        function rotate2(idx) {
            rotate1(idx, idx + 2, idx + 8, idx + 6);
            rotate1(idx + 1, idx + 5, idx + 7, idx + 3);
        }
        function rotateFacesX(directionIdx) {
            rotate1(directionIdx, 35 - directionIdx, 45 + directionIdx, 9 + directionIdx);
            rotate1(3 + directionIdx, 32 - directionIdx, 48 + directionIdx, 12 + directionIdx);
            rotate1(6 + directionIdx, 29 - directionIdx, 51 + directionIdx, 15 + directionIdx);
            if (directionIdx == 0) {
                rotate2(36);
                rotate2(36);
                rotate2(36);
            } else if (directionIdx == 2) {
                rotate2(18);
            }
        }
        function rotateFacesY(directionIdx) {
            rotate1(15 - 3 * directionIdx, 42 - 3 * directionIdx, 33 - 3 * directionIdx, 24 - 3 * directionIdx);
            rotate1(16 - 3 * directionIdx, 43 - 3 * directionIdx, 34 - 3 * directionIdx, 25 - 3 * directionIdx);
            rotate1(17 - 3 * directionIdx, 44 - 3 * directionIdx, 35 - 3 * directionIdx, 26 - 3 * directionIdx);
            if (directionIdx == 0) {
                rotate2(45);
                rotate2(45);
                rotate2(45);
            } else if (directionIdx == 2) {
                rotate2(0);
            }
        }
        function rotateFacesZ(directionIdx) {
            rotate1(3 * directionIdx, 20 - directionIdx, 53 - 3 * directionIdx, 42 + directionIdx);
            rotate1(1 + 3 * directionIdx, 23 - directionIdx, 52 - 3 * directionIdx, 39 + directionIdx);
            rotate1(2 + 3 * directionIdx, 26 - directionIdx, 51 - 3 * directionIdx, 36 + directionIdx);
            if (directionIdx == 0) {
                rotate2(27);
                rotate2(27);
                rotate2(27);
            } else if (directionIdx == 2) {
                rotate2(9);
            }
        }
        // console.log(rotationAction);
        let r = null;
        if (rotationAction.axis == "x") {
            r = rotateFacesX;
        } else if (rotationAction.axis == "y") {
            r = rotateFacesY;
        } else if (rotationAction.axis == "z") {
            r = rotateFacesZ;
        }
        if (r) {
            for (let i = 0; i < 3; i++) {
                if (rotationAction.direction[i] == +1) {
                    r(i);
                } else if (rotationAction.direction[i] == -1) {
                    r(i);
                    r(i);
                    r(i);
                }
            }
        }
    }

    // 全体方向
    function yellowToTopActions() {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        for (let i = 0; i < 10; i++) {
            // まず中央が黄色の面を黄色の位置に動かす
            // 本来青の面の中央が黄色の場合
            if (futureFaces[13].color == colorY) {
                pushAction("x", [+1, +1, +1]);
                continue;
            }
            // 本来赤の面の中央が黄色の場合
            if (futureFaces[22].color == colorY) {
                pushAction("z", [-1, -1, -1]);
                continue;
            }
            // 本来緑の面の中央が黄色の場合
            if (futureFaces[31].color == colorY) {
                pushAction("x", [-1, -1, -1]);
                continue;
            }
            // 本来橙の面の中央が黄色の場合
            if (futureFaces[40].color == colorY) {
                pushAction("z", [+1, +1, +1]);
                continue;
            }
            // 本来白の面の中央が黄色の場合
            if (futureFaces[49].color == colorY) {
                pushAction("x", [+1, +1, +1]);
                continue;
            }
            // 次に中央が青色の面を青色の位置に動かす
            // 青の面の中央が青の場合
            if (futureFaces[13].color == colorB) {
                break;
            }
            // 本来赤の面の中央が青の場合
            if (futureFaces[22].color == colorB) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            // 本来緑の面の中央が青の場合
            if (futureFaces[31].color == colorB) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            // 本来橙の面の中央が青の場合
            if (futureFaces[40].color == colorB) {
                pushAction("y", [-1, -1, -1]);
                continue;
            }
            // 本来白の面の中央が青の場合は、動かすと既に揃えた中央黄色まで動いてしまうので、動かさない
            return null;
        }
        return actions;
    }

    setActionBtnClickEvent("action-yellow-to-top", "", function () {
        return yellowToTopActions();
    });

    function normalizeActions(actions) {
        let result = [...actions];
        let i = 0;
        function dirMul(direction, sign) {
            if (sign > 0) {
                return direction;
            } else {
                return [-direction[2], -direction[1], -direction[0]];
            }
        }
        while (i < result.length) {
            const acti = result[i];
            if (acti.direction[0] != 0 && acti.direction[0] == acti.direction[1] && acti.direction[0] == acti.direction[2]) {
                let j = i + 1;
                const sign = acti.direction[0];
                const axis = acti.axis;
                while (j < result.length) {
                    const actj = result[j];
                    if (actj.axis == axis) {
                        result[j - 1] = { axis: actj.axis, direction: actj.direction, speed: actj.speed };
                    } else if (axis == "x") {
                        if (actj.axis == "y") {
                            result[j - 1] = { axis: "z", direction: dirMul(actj.direction, +sign), speed: actj.speed };
                        } else if (actj.axis == "z") {
                            result[j - 1] = { axis: "y", direction: dirMul(actj.direction, -sign), speed: actj.speed };
                        }
                    } else if (axis == "y") {
                        if (actj.axis == "z") {
                            result[j - 1] = { axis: "x", direction: dirMul(actj.direction, +sign), speed: actj.speed };
                        } else if (actj.axis == "x") {
                            result[j - 1] = { axis: "z", direction: dirMul(actj.direction, -sign), speed: actj.speed };
                        }
                    } else if (axis == "z") {
                        if (actj.axis == "x") {
                            result[j - 1] = { axis: "y", direction: dirMul(actj.direction, +sign), speed: actj.speed };
                        } else if (actj.axis == "y") {
                            result[j - 1] = { axis: "x", direction: dirMul(actj.direction, -sign), speed: actj.speed };
                        }
                    }
                    j++;
                }
                result.pop();
                continue;
            }
            i++;
        }
        return result;
    }

    function isSolved(actions) {
        if (actions == null) {
            return false;
        } else if (actions.length > 0) {
            return false;
        } else {
            return true;
        }
    }

    function whiteEdgeActions(edgeColor) {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        if (!isSolved(yellowToTopActions())) {
            return null;
        }
        if (edgeColor == colorR) {
            pushAction("y", [+1, +1, +1]);
        }
        if (edgeColor == colorG) {
            pushAction("y", [+1, +1, +1]);
            pushAction("y", [+1, +1, +1]);
        }
        if (edgeColor == colorO) {
            pushAction("y", [-1, -1, -1]);
        }
        for (let i = 0; i < 10; i++) {
            // 上層に白が上向き
            // 前
            // 本来黄青の辺の位置
            if (futureFaces[7].color == colorW && futureFaces[10].color == edgeColor) {
                pushAction("z", [0, 0, +1]); //f
                continue;
            }
            // 右
            // 本来黄赤の辺の位置
            if (futureFaces[5].color == colorW && futureFaces[19].color == edgeColor) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            // 後ろ
            // 本来黄緑の辺の位置
            if (futureFaces[1].color == colorW && futureFaces[28].color == edgeColor) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            // 左
            // 本来黄橙の辺の位置
            if (futureFaces[3].color == colorW && futureFaces[37].color == edgeColor) {
                pushAction("y", [0, 0, -1]);
                continue;
            }

            // 上層に白が側面
            // 前
            if (futureFaces[10].color == colorW && futureFaces[7].color == edgeColor) {
                pushAction("z", [0, 0, +1]);
                continue;
            }
            // 右
            if (futureFaces[19].color == colorW && futureFaces[5].color == edgeColor) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            // 後ろ
            if (futureFaces[28].color == colorW && futureFaces[1].color == edgeColor) {
                pushAction("y", [0, 0, +1]);
                pushAction("y", [0, 0, +1]);
                continue;
            }
            // 左
            if (futureFaces[37].color == colorW && futureFaces[3].color == edgeColor) {
                pushAction("y", [0, 0, -1]);
                continue;
            }

            // 中間層
            // 白が右で、対象が前
            if (futureFaces[21].color == colorW && futureFaces[14].color == edgeColor) {
                pushAction("z", [0, 0, +1]);
                continue;
            }
            // 白が後ろで、対象が右
            if (futureFaces[30].color == colorW && futureFaces[23].color == edgeColor) {
                pushAction("y", [-1, 0, 0]);
                pushAction("x", [0, 0, +1]);
                pushAction("y", [+1, 0, 0]);
                continue;
            }
            // 白が左で、対象が後ろ
            if (futureFaces[39].color == colorW && futureFaces[32].color == edgeColor) {
                pushAction("y", [-1, 0, 0]);
                pushAction("y", [-1, 0, 0]);
                pushAction("z", [-1, 0, 0]);
                pushAction("y", [+1, 0, 0]);
                pushAction("y", [+1, 0, 0]);
                continue;
            }
            // 白が前で、対象が左
            if (futureFaces[12].color == colorW && futureFaces[41].color == edgeColor) {
                pushAction("y", [+1, 0, 0]);
                pushAction("x", [-1, 0, 0]);
                pushAction("y", [-1, 0, 0]);
                continue;
            }
            // 白が前で、対象が右
            if (futureFaces[14].color == colorW && futureFaces[21].color == edgeColor) {
                pushAction("y", [-1, 0, 0]);
                pushAction("x", [0, 0, -1]);
                pushAction("y", [+1, 0, 0]);
                continue;
            }
            // 白が右で、対象が後ろ
            if (futureFaces[23].color == colorW && futureFaces[30].color == edgeColor) {
                pushAction("y", [-1, 0, 0]);
                pushAction("y", [-1, 0, 0]);
                pushAction("z", [+1, 0, 0]);
                pushAction("y", [+1, 0, 0]);
                pushAction("y", [+1, 0, 0]);
                continue;
            }
            // 白が後ろで、対象が左
            if (futureFaces[32].color == colorW && futureFaces[39].color == edgeColor) {
                pushAction("y", [+1, 0, 0]);
                pushAction("x", [+1, 0, 0]);
                pushAction("y", [-1, 0, 0]);
                continue;
            }
            // 白が左で、対象が前
            if (futureFaces[41].color == colorW && futureFaces[12].color == edgeColor) {
                pushAction("z", [0, 0, -1]);
                continue;
            }

            // 下層に白が下向き
            // 前
            if (futureFaces[46].color == colorW && futureFaces[16].color == edgeColor) {
                break;
            }
            // 右
            if (futureFaces[50].color == colorW && futureFaces[25].color == edgeColor) {
                pushAction("x", [0, 0, -1]);
                continue;
            }
            // 後ろ
            if (futureFaces[52].color == colorW && futureFaces[34].color == edgeColor) {
                pushAction("z", [+1, 0, 0]);
                continue;
            }
            // 左
            if (futureFaces[48].color == colorW && futureFaces[43].color == edgeColor) {
                pushAction("x", [+1, 0, 0]);
                continue;
            }

            // 下層に白が側面
            // 前
            if (futureFaces[16].color == colorW && futureFaces[46].color == edgeColor) {
                pushAction("z", [0, 0, -1]);
                continue;
            }
            // 右
            if (futureFaces[25].color == colorW && futureFaces[50].color == edgeColor) {
                pushAction("x", [0, 0, -1]);
                continue;
            }
            // 後ろ
            if (futureFaces[34].color == colorW && futureFaces[52].color == edgeColor) {
                pushAction("z", [+1, 0, 0]);
                continue;
            }
            // 左
            if (futureFaces[43].color == colorW && futureFaces[48].color == edgeColor) {
                pushAction("x", [+1, 0, 0]);
                continue;
            }

            return null;
        }
        return normalizeActions(actions);
    }

    function whiteEdgeHandler(id, edgeColor) {
        setActionBtnClickEvent(id, "", function () {
            return whiteEdgeActions(edgeColor);
        });
    }
    whiteEdgeHandler("action-white-blue", colorB);
    whiteEdgeHandler("action-white-red", colorR);
    whiteEdgeHandler("action-white-green", colorG);
    whiteEdgeHandler("action-white-orange", colorO);

    function whiteCornerActions(edgeColor1, edgeColor2) {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        if (!isSolved(whiteEdgeActions(edgeColor1))) {
            return null;
        }
        if (!isSolved(whiteEdgeActions(edgeColor2))) {
            return null;
        }
        if (edgeColor1 == colorR) {
            pushAction("y", [+1, +1, +1]);
        }
        if (edgeColor1 == colorG) {
            pushAction("y", [+1, +1, +1]);
            pushAction("y", [+1, +1, +1]);
        }
        if (edgeColor1 == colorO) {
            pushAction("y", [-1, -1, -1]);
        }
        for (let i = 0; i < 10; i++) {
            // 上層
            if (futureFaces[11].color == colorW && futureFaces[8].color == edgeColor1 && futureFaces[18].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            if (futureFaces[20].color == colorW && futureFaces[2].color == edgeColor1 && futureFaces[27].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            if (futureFaces[29].color == colorW && futureFaces[0].color == edgeColor1 && futureFaces[36].color == edgeColor2) {
                pushAction("y", [0, 0, -1]);
                continue;
            }
            if (futureFaces[38].color == colorW && futureFaces[6].color == edgeColor1 && futureFaces[9].color == edgeColor2) {
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, -1]);
                continue;
            }
            if (futureFaces[18].color == colorW && futureFaces[11].color == edgeColor1 && futureFaces[8].color == edgeColor2) {
                pushAction("y", [0, 0, -1]);
                continue;
            }
            if (futureFaces[27].color == colorW && futureFaces[20].color == edgeColor1 && futureFaces[2].color == edgeColor2) {
                pushAction("z", [0, 0, -1]);
                pushAction("y", [0, 0, +1]);
                pushAction("z", [0, 0, +1]);
                continue;
            }
            if (futureFaces[36].color == colorW && futureFaces[29].color == edgeColor1 && futureFaces[0].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            if (futureFaces[9].color == colorW && futureFaces[38].color == edgeColor1 && futureFaces[6].color == edgeColor2) {
                pushAction("y", [0, 0, -1]);
                continue;
            }
            if (futureFaces[8].color == colorW && futureFaces[18].color == edgeColor1 && futureFaces[11].color == edgeColor2) {
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, -1]);
                continue;
            }
            if (futureFaces[2].color == colorW && futureFaces[27].color == edgeColor1 && futureFaces[20].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            if (futureFaces[0].color == colorW && futureFaces[36].color == edgeColor1 && futureFaces[29].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            if (futureFaces[6].color == colorW && futureFaces[9].color == edgeColor1 && futureFaces[38].color == edgeColor2) {
                pushAction("y", [0, 0, -1]);
                continue;
            }

            // 下層
            if (futureFaces[47].color == colorW && futureFaces[17].color == edgeColor1 && futureFaces[24].color == edgeColor2) {
                break;
            }
            if (futureFaces[17].color == colorW && futureFaces[24].color == edgeColor1 && futureFaces[47].color == edgeColor2) {
                pushAction("z", [0, 0, -1]);
                pushAction("y", [0, 0, -1]);
                pushAction("z", [0, 0, +1]);
                continue;
            }
            if (futureFaces[24].color == colorW && futureFaces[47].color == edgeColor1 && futureFaces[17].color == edgeColor2) {
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, -1]);
                continue;
            }
            // いったん脱出のみ
            if (futureFaces[47].color == colorW || futureFaces[17].color == colorW || futureFaces[24].color == colorW) {
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, -1]);
                break;
            }

            return null;
        }
        return normalizeActions(actions);
    }

    function whiteCornerHandler(id, edgeColor1, edgeColor2) {
        setActionBtnClickEvent(id, "", function () {
            return whiteCornerActions(edgeColor1, edgeColor2);
        });
    }
    whiteCornerHandler("action-white-blue-red", colorB, colorR);
    whiteCornerHandler("action-white-red-green", colorR, colorG);
    whiteCornerHandler("action-white-green-orange", colorG, colorO);
    whiteCornerHandler("action-white-orange-blue", colorO, colorB);

    function middleEdgeActions(edgeColor1, edgeColor2) {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        if (!isSolved(whiteCornerActions(edgeColor1, edgeColor2))) {
            return null;
        }
        if (edgeColor1 == colorR) {
            pushAction("y", [+1, +1, +1]);
        }
        if (edgeColor1 == colorG) {
            pushAction("y", [+1, +1, +1]);
            pushAction("y", [+1, +1, +1]);
        }
        if (edgeColor1 == colorO) {
            pushAction("y", [-1, -1, -1]);
        }
        for (let i = 0; i < 10; i++) {
            // 上層
            if (futureFaces[10].color == edgeColor1 && futureFaces[7].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            if (futureFaces[19].color == edgeColor1 && futureFaces[5].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }
            if (futureFaces[28].color == edgeColor1 && futureFaces[1].color == edgeColor2) {
                pushAction("y", [0, 0, -1]);
                continue;
            }
            if (futureFaces[37].color == edgeColor1 && futureFaces[3].color == edgeColor2) {
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, -1]);
                pushAction("y", [0, 0, -1]);
                pushAction("z", [0, 0, -1]);
                pushAction("y", [0, 0, +1]);
                pushAction("z", [0, 0, +1]);
                continue;
            }

            if (futureFaces[7].color == edgeColor1 && futureFaces[10].color == edgeColor2) {
                pushAction("y", [0, 0, -1]);
                continue;
            }
            if (futureFaces[5].color == edgeColor1 && futureFaces[19].color == edgeColor2) {
                pushAction("y", [0, 0, -1]);
                continue;
            }
            if (futureFaces[1].color == edgeColor1 && futureFaces[28].color == edgeColor2) {
                pushAction("z", [0, 0, -1]);
                pushAction("y", [0, 0, +1]);
                pushAction("z", [0, 0, +1]);
                pushAction("y", [0, 0, +1]);
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, -1]);
                continue;
            }
            if (futureFaces[3].color == edgeColor1 && futureFaces[37].color == edgeColor2) {
                pushAction("y", [0, 0, +1]);
                continue;
            }

            // 中間層
            if (futureFaces[14].color == edgeColor1 && futureFaces[21].color == edgeColor2) {
                break;
            }
            // いったん脱出のみ
            if (futureFaces[21].color != colorW && futureFaces[21].color != colorY && futureFaces[14].color != colorW && futureFaces[14].color != colorY) {
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, -1]);
                pushAction("y", [0, 0, -1]);
                pushAction("z", [0, 0, -1]);
                pushAction("y", [0, 0, +1]);
                pushAction("z", [0, 0, +1]);
                break;
            }

            return null;
        }
        return normalizeActions(actions);
    }

    function middleEdgeHandler(id, edgeColor1, edgeColor2) {
        setActionBtnClickEvent(id, "", function () {
            return middleEdgeActions(edgeColor1, edgeColor2);
        });
    }
    middleEdgeHandler("action-blue-red", colorB, colorR);
    middleEdgeHandler("action-red-green", colorR, colorG);
    middleEdgeHandler("action-green-orange", colorG, colorO);
    middleEdgeHandler("action-orange-blue", colorO, colorB);

    function yellowEdgeRotActions() {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        if (!isSolved(middleEdgeActions(colorB, colorR))) {
            return null;
        }
        if (!isSolved(middleEdgeActions(colorR, colorG))) {
            return null;
        }
        if (!isSolved(middleEdgeActions(colorG, colorO))) {
            return null;
        }
        if (!isSolved(middleEdgeActions(colorO, colorB))) {
            return null;
        }
        for (let i = 0; i < 10; i++) {
            if (futureFaces[1].color == colorY &&
                futureFaces[3].color == colorY &&
                futureFaces[5].color == colorY &&
                futureFaces[7].color == colorY) {
                break;
            }
            if (futureFaces[3].color == colorY && futureFaces[5].color == colorY) {
                pushAction("z", [0, 0, +1]);
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, +1]);
                pushAction("x", [0, 0, -1]);
                pushAction("y", [0, 0, -1]);
                pushAction("z", [0, 0, -1]);
                continue;
            }
            if (futureFaces[1].color == colorY && futureFaces[7].color == colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }

            if (futureFaces[1].color == colorY && futureFaces[3].color == colorY) {
                pushAction("z", [0, 0, +1]);
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, +1]);
                pushAction("x", [0, 0, -1]);
                pushAction("y", [0, 0, -1]);
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, +1]);
                pushAction("x", [0, 0, -1]);
                pushAction("y", [0, 0, -1]);
                pushAction("z", [0, 0, -1]);
                continue;
            }
            if (futureFaces[3].color == colorY && futureFaces[7].color == colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[5].color == colorY && futureFaces[7].color == colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[1].color == colorY && futureFaces[5].color == colorY) {
                pushAction("y", [-1, -1, -1]);
                continue;
            }
            if (true) {
                pushAction("z", [0, 0, +1]);
                pushAction("x", [0, 0, +1]);
                pushAction("y", [0, 0, +1]);
                pushAction("x", [0, 0, -1]);
                pushAction("y", [0, 0, -1]);
                pushAction("z", [0, 0, -1]);
                continue;
            }

            return null;
        }
        return normalizeActions(actions);
    }

    setActionBtnClickEvent("action-yellow-edge-rot", "", function () {
        return yellowEdgeRotActions();
    });

    function yellowCornerRotActions() {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        if (!isSolved(yellowEdgeRotActions())) {
            return null;
        }
        function pushActionSet() {
            pushAction("x", [0, 0, +1]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [0, 0, -1]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [0, 0, +1]);
            pushAction("y", [0, 0, +1]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [0, 0, -1]);
        }
        for (let i = 0; i < 10; i++) {
            if (futureFaces[0].color == colorY &&
                futureFaces[2].color == colorY &&
                futureFaces[6].color == colorY &&
                futureFaces[8].color == colorY) {
                break;
            }

            if (futureFaces[0].color == colorY && futureFaces[2].color == colorY) {
                if (futureFaces[18].color == colorY) {
                    pushActionSet();
                } else {
                    pushAction("y", [+1, +1, +1]);
                    pushActionSet();
                }
                continue;
            }
            if (futureFaces[0].color == colorY && futureFaces[6].color == colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[6].color == colorY && futureFaces[8].color == colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[8].color == colorY && futureFaces[2].color == colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }

            if (futureFaces[0].color == colorY && futureFaces[8].color == colorY) {
                if (futureFaces[27].color == colorY) {
                    pushActionSet();
                } else {
                    pushAction("y", [+1, +1, +1]);
                    pushAction("y", [+1, +1, +1]);
                    pushActionSet();
                }
                continue;
            }
            if (futureFaces[2].color == colorY && futureFaces[6].color == colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }

            if (futureFaces[0].color == colorY) {
                pushAction("y", [-1, -1, -1]);
                pushActionSet();
                continue;
            }

            if (futureFaces[9].color != colorY || futureFaces[11].color != colorY) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }

            if (futureFaces[27].color == colorY) {
                pushAction("y", [-1, -1, -1]);
                pushActionSet();
                continue;
            }

            if (true) {
                pushAction("y", [+1, +1, +1]);
                pushActionSet();
                continue;
            }

            return null;
        }
        return normalizeActions(actions);
    }

    setActionBtnClickEvent("action-yellow-corner-rot", "", function () {
        return yellowCornerRotActions();
    });

    function yellowCornerPosActions() {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        if (!isSolved(yellowCornerRotActions())) {
            return null;
        }
        function pushActionSet() {
            pushAction("x", [0, 0, -1]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [+1, 0, 0]);
            pushAction("y", [0, 0, +1]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [0, 0, +1]);
            pushAction("y", [0, 0, -1]);
            pushAction("x", [0, 0, -1]);
            pushAction("y", [0, 0, +1]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [-1, 0, +1]);
        }
        for (let i = 0; i < 10; i++) {
            if (futureFaces[9].color == futureFaces[11].color &&
                futureFaces[18].color == futureFaces[20].color &&
                futureFaces[27].color == futureFaces[29].color &&
                futureFaces[36].color == futureFaces[38].color) {
                if (futureFaces[13].color != colorB) {
                    pushAction("y", [+1, +1, +1]);
                    continue;
                }
                if (futureFaces[9].color == colorB && futureFaces[18].color == colorR) {
                    break;
                }
                if (futureFaces[9].color == colorR && futureFaces[18].color == colorG) {
                    pushAction("y", [0, 0, -1]);
                    continue;
                }
                if (futureFaces[9].color == colorG && futureFaces[18].color == colorO) {
                    pushAction("y", [0, 0, +1]);
                    pushAction("y", [0, 0, +1]);
                    continue;
                }
                if (futureFaces[9].color == colorO && futureFaces[18].color == colorB) {
                    pushAction("y", [0, 0, +1]);
                    continue;
                }
            }

            if (futureFaces[9].color == futureFaces[11].color && futureFaces[18].color == futureFaces[20].color) {
                pushActionSet();
                continue;
            }
            if (futureFaces[18].color == futureFaces[20].color && futureFaces[27].color == futureFaces[29].color) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[27].color == futureFaces[29].color && futureFaces[36].color == futureFaces[38].color) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[36].color == futureFaces[38].color && futureFaces[9].color == futureFaces[11].color) {
                pushAction("y", [-1, -1, -1]);
                continue;
            }

            if (futureFaces[9].color == futureFaces[11].color) {
                pushActionSet();
                continue;
            }
            if (futureFaces[18].color == futureFaces[20].color) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[27].color == futureFaces[29].color) {
                pushAction("y", [+1, +1, +1]);
                continue;
            }
            if (futureFaces[36].color == futureFaces[38].color) {
                pushAction("y", [-1, -1, -1]);
                continue;
            }

            if (true) {
                pushActionSet();
                continue;
            }

            return null;
        }
        return normalizeActions(actions);
    }

    setActionBtnClickEvent("action-yellow-corner-pos", "", function () {
        return yellowCornerPosActions();
    });

    function yellowEdgePosActions() {
        let futureFaces = copyFaces(faces2);
        const actions = [];
        const speed = 1;
        function pushAction(axis, direction) {
            const action = { axis, direction, speed };
            actions.push(action);
            rotateFaces(action, futureFaces);
        }
        if (!isSolved(yellowCornerPosActions())) {
            return null;
        }
        function pushActionSet() {
            pushAction("x", [0, -1, 0]);
            pushAction("x", [0, -1, 0]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [0, -1, 0]);
            pushAction("y", [0, 0, +1]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [0, +1, 0]);
            pushAction("y", [0, 0, +1]);
            pushAction("x", [0, -1, 0]);
            pushAction("x", [0, -1, 0]);
        }
        for (let i = 0; i < 10; i++) {
            if (futureFaces[10].color == futureFaces[14].color &&
                futureFaces[19].color == futureFaces[23].color) {
                break;
            }

            if (futureFaces[10].color == futureFaces[14].color) {
                pushAction("y", [+1, +1, +1]);
                pushAction("y", [+1, +1, +1]);
                pushActionSet();
                continue;
            }

            if (futureFaces[19].color == futureFaces[23].color) {
                pushAction("y", [-1, -1, -1]);
                pushActionSet();
                continue;
            }

            if (futureFaces[28].color == futureFaces[32].color) {
                pushActionSet();
                continue;
            }

            if (futureFaces[37].color == futureFaces[41].color) {
                pushAction("y", [+1, +1, +1]);
                pushActionSet();
                continue;
            }

            if (true) {
                pushActionSet();
                continue;
            }

            return null;
        }
        return normalizeActions(actions);
    }

    setActionBtnClickEvent("action-yellow-edge-pos", "", function () {
        return yellowEdgePosActions();
    });

    // for (const act of shuffleActions()) {
    //     pushActionToQueue(act);
    // }

    function animate() {
        requestAnimationFrame(animate);
        actRotation();
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
    // activateBtns();

    //--------------------------------------------------------------------------------

    //手順を画面に表示
    function displayAct(act) {
        function array_equal(a, b) {
            if (!Array.isArray(a)) return false;
            if (!Array.isArray(b)) return false;
            if (a.length != b.length) return false;
            for (var i = 0, n = a.length; i < n; ++i) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }
        const display = document.getElementById('act')

        if (act.axis == "x" && array_equal(act.direction, [0, 0, 1])) {
            display.innerHTML += "R"
        }
        else if (act.axis == "x" && array_equal(act.direction, [0, 0, -1])) {
            display.innerHTML += "R'"
        }
        else if (act.axis == "x" && array_equal(act.direction, [-1, 0, 0])) {
            display.innerHTML += "L"
        }
        else if (act.axis == "x" && array_equal(act.direction, [1, 0, 0])) {
            display.innerHTML += "L'"
        }
        else if (act.axis == "y" && array_equal(act.direction, [0, 0, 1])) {
            display.innerHTML += "U"
        }
        else if (act.axis == "y" && array_equal(act.direction, [0, 0, -1])) {
            display.innerHTML += "U'"
        }
        else if (act.axis == "z" && array_equal(act.direction, [0, 0, 1])) {
            display.innerHTML += "F"
        }
        else if (act.axis == "z" && array_equal(act.direction, [0, 0, -1])) {
            display.innerHTML += "F'"
        }
        else if (act.axis == "y" && array_equal(act.direction, [-1, 0, 0])) {
            display.innerHTML += "D"
        }
        else if (act.axis == "y" && array_equal(act.direction, [1, 0, 0])) {
            display.innerHTML += "D'"
        }
        else if (act.axis == "z" && array_equal(act.direction, [-1, 0, 0])) {
            display.innerHTML += "B"
        }
        else if (act.axis == "z" && array_equal(act.direction, [1, 0, 0])) {
            display.innerHTML += "B'"
        }
        else if (act.axis == "x" && array_equal(act.direction, [0, -1, 0])) {
            display.innerHTML += "M"
        }
        else if (act.axis == "x" && array_equal(act.direction, [0, 1, 0])) {
            display.innerHTML += "M'"
        }
        else if (act.axis == "x" && array_equal(act.direction, [1, 1, 1])) {
            display.innerHTML += "X"
        }
        else if (act.axis == "x" && array_equal(act.direction, [-1, -1, -1])) {
            display.innerHTML += "X'"
        }
        else if (act.axis == "y" && array_equal(act.direction, [1, 1, 1])) {
            display.innerHTML += "Y"
        }
        else if (act.axis == "y" && array_equal(act.direction, [-1, -1, -1])) {
            display.innerHTML += "Y'"
        }
        else if (act.axis == "z" && array_equal(act.direction, [1, 1, 1])) {
            display.innerHTML += "Z"
        }
        else if (act.axis == "z" && array_equal(act.direction, [-1, -1, -1])) {
            display.innerHTML += "Z'"
        }
    }

    // 任意の盤面に変更可能にする
    function raycast(e) {
        const mouse = new THREE.Vector2();
        //1. マウスポインタの位置座標の取得
        mouse.x = (e.clientX / width) * 2 - 1;
        mouse.y = - (e.clientY / height) * 2 + 1;

        //2. 光線を発射
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        //3. 光線と交わるオブジェクトを収集(ヒエラルキーを持った子要素も対象とする場合は第二引数にtrueを指定する)
        var intersects = raycaster.intersectObjects(scene.children, false);
        let activeFaceIndex = 0;
        if (intersects.length > 0) {
            // クリックした面の色を変更
            activeFaceIndex = intersects[0].face.materialIndex;
            const color = intersects[0].object.material[activeFaceIndex].color

            const i = intersects[0].object.name

            if (color.equals(new THREE.Color(colorY))) {
                intersects[0].object.material[activeFaceIndex].color.setHex(colorB);
                faces[i].color = colorB
                faces2[i].color = colorB
            } else if (color.equals(new THREE.Color(colorB))) {
                intersects[0].object.material[activeFaceIndex].color.setHex(colorR);
                faces[i].color = colorR
                faces2[i].color = colorR
            } else if (color.equals(new THREE.Color(colorR))) {
                intersects[0].object.material[activeFaceIndex].color.setHex(colorG);
                faces[i].color = colorG
                faces2[i].color = colorG
            } else if (color.equals(new THREE.Color(colorG))) {
                intersects[0].object.material[activeFaceIndex].color.setHex(colorO);
                faces[i].color = colorO
                faces2[i].color = colorO
            } else if (color.equals(new THREE.Color(colorO))) {
                intersects[0].object.material[activeFaceIndex].color.setHex(colorW);
                faces[i].color = colorW
                faces2[i].color = colorW
            } else if (color.equals(new THREE.Color(colorW))) {
                intersects[0].object.material[activeFaceIndex].color.setHex(colorY);
                faces[i].color = colorY
                faces2[i].color = colorY
            }
            console.log(intersects[0]);
            console.log(faces)
            console.log(faces2);
        }

    }
    renderer.domElement.addEventListener('click', raycast, false);

    document.getElementById('set').onclick = function () {
        document.getElementById('act').innerHTML = ''
        activateBtns();

    }
}