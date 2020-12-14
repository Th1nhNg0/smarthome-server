import RPi.GPIO as GPIO
from time import sleep
import os
import glob
import socketio
import datetime
import _thread

RELAY_OUTPUT = [4, 5, 6, 12, 17, 18, 25, 27]

GPIO.setmode(GPIO.BCM)
for relay in RELAY_OUTPUT:
    GPIO.setup(relay, GPIO.OUT)

# cua
GPIO.setup(20, GPIO.OUT)
door_GPIO = GPIO.PWM(20, 50)
door_GPIO.start(0)

sio = socketio.Client()
os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')

base_dir = '/sys/bus/w1/devices/'
device_folders = glob.glob(base_dir+'28*')
device_files = [x+'/w1_slave' for x in device_folders]


def read_temp_raw(device_file):
    f = open(device_file)
    lines = f.readlines()
    f.close()
    return lines


def read_temp(device_file):
    lines = read_temp_raw(device_file)
    while lines[0].strip()[-3:] != 'YES':
        sleep(0.1)
        lines = read_temp_raw(device_file)
    kqn = lines[1].find('t=')
    if kqn != -1:
        return lines[1][kqn+2:-1]


@sio.event
def connect():
    print("Da ket noi toi server")


@sio.event
def connect_error():
    print("khong the ket noi server")


@sio.event
def disconnect():
    print("da ngat ket noi server")


@sio.event
def door(data):
    state = data['state']
    print("door", state)
    if state:
        door_GPIO.ChangeDutyCycle(7.5)
    else:
        door_GPIO.ChangeDutyCycle(12.5)


@sio.event
def GPIO_control(data):
    cong = int(data['GPIO'])
    state = int(data['state'])
    print('cong', cong, 'state', state)
    GPIO.output(cong, state)

# chay ham nay de xem chan nao dang bat/tat


def GPIO_info(time):
    data = {}
    for relay in RELAY_OUTPUT:
        data[relay] = GPIO.input(relay)
    sio.emit('board_data', {'GPIO': data})
    print('send GPIO info', data)
    sleep(time)
    GPIO_info(time)


def temp_info(time, temp_file, temp_id):
    nhietdo = read_temp(temp_file)
    thoigian = str(datetime.datetime.now())
    send_data = {'date': thoigian, 'value': float(nhietdo)/1000, 'id': temp_id}
    sio.emit('temp_sensor', send_data)
    print('send temp info', temp_id, nhietdo)
    sleep(time)
    temp_info(time, temp_file, temp_id)


sio.connect('https://smarthouse-spkt.herokuapp.com/?name=board')

# sio.connect('http://192.168.43.60:3000?name=board')

try:
    _thread.start_new_thread(GPIO_info, (1,))
    for (index, x) in enumerate(device_files):
        _thread.start_new_thread(temp_info, (1, x, index,))

except:
    print("Error: unable to start thread")
sio.wait()
