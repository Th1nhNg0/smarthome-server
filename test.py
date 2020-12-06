import random
import threading
import socketio
import datetime


# standard Python
sio = socketio.Client()
v = [30, 30, 30, 30]


@sio.event
def connect():
    print("I'm connected!")


@sio.event
def connect_error():
    print("The connection failed!")


@sio.event
def disconnect():
    print("I'm disconnected!")


sio.connect('http://localhost:3000?name=board')


def setInterval(func, time):
    e = threading.Event()
    while not e.wait(time):
        func()


def foo():
    global v

    x = str(datetime.datetime.now())
    for i in range(len(v)):
        v[i] = v[i] + random.uniform(-1, 1)
    send_data = [{'date': x, 'value': vi} for vi in v]
    sio.emit('temp_sensor', send_data)
    print("send data to server", v)


setInterval(foo, 1)
