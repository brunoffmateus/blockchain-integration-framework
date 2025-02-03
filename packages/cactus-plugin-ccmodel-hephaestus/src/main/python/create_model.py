import sys
import os
# uncomment if problems with dependencies
#%pip install pm4py
#%pip install pandas
import pm4py
import time
import pandas
import pickle
import json

def import_csv_original(file_path):
    event_log = pandas.read_csv(file_path, sep=';')
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def import_json_original(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    event_log = pandas.DataFrame(data)
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

##################################################################

# uses alpha miner algorithm
def create_and_serialize_model_alpha(ccLog):
    pn, im, fm = pm4py.discover_petri_net_alpha(ccLog)
    
    # to view petri net:
    # pm4py.view_petri_net(pn, im, fm, file_name)
    
    # to save petri net image:
    # file_name = f"alpha_miner_PN.png"
    # pm4py.save_vis_petri_net(pn, im, fm, file_name, format="png")
    
    return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)

##################################################################

# uses heuristics miner algorithm
def create_and_serialize_model_heuristics(ccLog):
    pn, im, fm = pm4py.discover_petri_net_heuristics(ccLog)

    # to view petri net:
    # pm4py.view_petri_net(pn, im, fm, file_name)
    
    # to save petri net image:
    # file_name = f"heuristics_miner_PN.png"
    # pm4py.save_vis_petri_net(pn, im, fm, file_name, format="png")
    
    return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)

##################################################################

# uses inductive miner algorithm
def create_and_serialize_model_inductive(ccLog):
    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog)
    
    # to write to a file:
    # pm4py.write_pnml(pn, im, fm, pnml_file)
    
    # to view petri net:
    # pm4py.view_petri_net(pn, im, fm, file_name)
    
    # to save petri net image:
    # file_name = f"inductive_miner_PN.png"
    # pm4py.save_vis_petri_net(pn, im, fm, file_name, format="png")
    
    return str(pn.places) + ";" + str(pn.transitions) + ";" + str(pn.arcs) + ";" + str(im) + ";" + str(fm)

##################################################################

def create_and_serialize_model(ccLog, mining_process):
    create_and_serialize_model_alpha(ccLog)
    create_and_serialize_model_heuristics(ccLog)
    
    if mining_process == "alpha":
        return create_and_serialize_model_alpha(ccLog)
    elif mining_process == "heuristics":
        return create_and_serialize_model_heuristics(ccLog)
    elif mining_process == "inductive":
        return create_and_serialize_model_inductive(ccLog)

##################################################################

def main():
    file_path = sys.argv[1]
    mining_process = sys.argv[2]
    
    if not os.path.exists(file_path):
        print(f"File '{file_path}' does not exist")
        exit(1)
        
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.csv':
        ccLog = import_csv_original(file_path)
        serialized_model = create_and_serialize_model(ccLog, mining_process)
        print(serialized_model)
    elif file_extension == '.json':
        ccLog = import_json_original(file_path)
        serialized_model = create_and_serialize_model(ccLog, mining_process)
        print(serialized_model)
    else:
        print(f"Unsupported file type: {file_extension}")
        exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 create_model.py path_to_log_file mining_process")
        exit(1)
    
    main()