import random
import threading
import socketio
import datetime
import _thread
from time import sleep


# standard Python
RELAY_OUTPUT = [4, 5, 6, 12, 17, 18, 25, 27]
sio = socketio.Client()
v = [30, 30, 30, 30]


@sio.event
def connect():
    print("I'm connected!")


@sio.event
def connect_error():
    print("The connection failed!")


@sio.event
def door(data):
    state = data['state']
    print("door", state)
    if state:
        p.ChangeDutyCycle(7.5)
    else:
        p.ChangeDutyCycle(12.5)


@sio.event
def GPIO_control(data):
    cong = int(data['GPIO'])
    state = int(data['state'])
    print('cong', cong, 'state', state)


@sio.event
def disconnect():
    print("I'm disconnected!")


sio.connect('https://smarthouse-spkt.herokuapp.com/?name=board')
# sio.connect('http://localhost:3000?name=board')


def temp_info(time):
    global v

    x = str(datetime.datetime.now())
    for i in range(len(v)):
        v[i] = v[i] + random.uniform(-8, 8)
    send_data = [{'date': x, 'value': vi} for vi in v]
    sio.emit('temp_sensor', send_data)
    print(1)
    sleep(time)
    temp_info(time)


def GPIO_info(time):
    data = {}
    for relay in RELAY_OUTPUT:
        data[relay] = random.randint(0, 1)
    sio.emit('board_data', {'GPIO': data})
    print(2)
    sleep(time)
    GPIO_info(time)


try:
    _thread.start_new_thread(temp_info, (1,))
    _thread.start_new_thread(GPIO_info, (1,))

except:
    print("Error: unable to start thread")
