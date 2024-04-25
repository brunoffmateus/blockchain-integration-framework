import sys
import os
# uncomment if problems with dependencies
#%pip install pm4py
#%pip install pandas
import json
import pm4py
import datetime as dt
import time
import pandas
from pm4py.visualization.petri_net import visualizer as pn_visualizer
from pm4py.objects.petri_net.obj import PetriNet #, Marking

#chage path if necessary
path = os.getcwd()
parent = os.path.dirname(path)
csv_dir = path + "/packages/cactus-plugin-ccmodel-hephaestus/src/test/csv"

def import_csv_original(file_path):
    event_log = pandas.read_csv(file_path, sep=';')
    event_log = pm4py.format_dataframe(event_log, case_id='caseID', activity_key='methodName', timestamp_key='timestamp')
    return event_log

def getAttributeFromLog(event_log, attr):
    entries = pm4py.get_event_attribute_values(event_log, attr)
    print("Entries: {}\n".format(entries))
    return entries

def check_conformity(ccLog_next, ccLog_prev):
    # process_tree = pm4py.discover_process_tree_inductive(ccLog_next)
    # print(process_tree)
    # pn, im, fm = pm4py.convert_to_petri_net(process_tree)

    pn, im, fm = pm4py.discover_petri_net_inductive(ccLog_prev)
    # gviz = pn_visualizer.apply(pn, im, fm)
    # pn_visualizer.view(gviz)
    pm4py.view_petri_net(pn, im, fm)
    print("\n----petri net:")
    print(pn)

def new():
    # pm4py.write_pnml(pn, im, fm, "petri.pnml")
    print("\n----places:")
    places = pn.places
    print(places)
    print("\n----transitions:")
    transitions = pn.transitions
    print(transitions)
    print("\n----arcs:")
    arcs = pn.arcs
    print(arcs)


    print("\n----diagnostics:")
    diagnostics = pm4py.conformance_diagnostics_alignments(ccLog_next, pn, im, fm)
    print(diagnostics)

    trace = [activity for activity, _ in diagnostics[0]['alignment'] if _ != '>>']
    print("\n----trace:")
    print(trace)

    net = PetriNet("new_petri_net")
    
    # add the places to the new Petri Net
    print("new places:")
    for place in places:
        print(place)
        net.places.add(place)
    print("\n")
    
    # add the transitions to the new Petri Net
    print("new net transitions:")
    for transition in transitions:
        print(transition)
        net.transitions.add(transition)
    print("\n")

    # add the arcs to the new Petri Net
    # arc_keys = list(arcs.keys())
    # for key in arc_keys:
        # petri_utils.add_arc_from_to(key, arcs[key], net)
    print("\n")
    print("new arcs")
    for arc in arcs:
        print(arc)
        print("\n")
    

    initial_marking = im
    final_marking = fm
    pm4py.view_petri_net(net, initial_marking, final_marking)

    print("\n----new diagnostics:")
    diagnostics2 = pm4py.conformance_diagnostics_alignments(ccLog_next, net, initial_marking, final_marking)
    print(diagnostics2)



def main():
    startTime = time.perf_counter()

    file_next_path = os.path.join(csv_dir, file_next)
    file_prev_path = os.path.join(csv_dir, file_prev)

    if (not os.path.exists(file_next_path)):
        print(f"File '{file_next_path}' does not exist")
        exit(1)
    
    if (not os.path.exists(file_prev_path)):
        print(f"File '{file_prev_path}' does not exist")
        exit(1)
    
    ccLog_next = import_csv_original(file_next_path)
    ccLog_prev = import_csv_original(file_prev_path)

    check_conformity(ccLog_next, ccLog_prev)

    endTime = time.perf_counter()
    timeTakenMs = endTime - startTime
    print(f"\nExecution Time (ms): {timeTakenMs*1000:0.3f}" )

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 print_all_cclogs.py file_to_create_model")
        exit()
    
    file_next = sys.argv[1] # file with the next ccevent
    file_prev = sys.argv[2] # file with to use conformance check
    main()